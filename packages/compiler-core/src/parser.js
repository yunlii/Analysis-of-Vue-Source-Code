import { NodeTypes } from "./ast.js";
/**
 * 返回当前解析到的位置。
 * @param {*} context 
 * @returns 
 */
function getCursor(context) {
    let { line, column, offset } = context;
    return { line, column, offset };
}
/**
 * start是解析开始的位置，end是解析完成后的位置。
 * @param {*} context 
 * @param {*} start 
 * @param {*} end 
 * @returns 
 */
function getSelection(context, start, end) {
    end = end || getCursor(context);
    return {
        start,
        end,
        source: context.originalSource.slice(start.offset, end.offset)
    };
}
/**
 * 记录了当前解析到了源码的哪个位置，并去除已经解析的代码。
 * @param {*} context 
 * @param {*} endIndex 
 */
function advanceBy(context, endIndex) {
    let c = context.source;
    advancePositionWithMutation(context, c, endIndex);
    context.source = c.slice(endIndex);
}
/**
 * 在解析模板时，自动跳过无意义的空白字符‌
 * @param {*} context 
 */
function advanceBySpaces(context) {
    const match = /^[ \t\r\n]/.exec(context.source);
    if (match) {
        advanceBy(context, match[0].length);
    }
}
/**
 * 记录了当前解析到了源码的哪个位置。
 * @param {*} context 要更新的位置对象
 * @param {*} source 被处理的源码字符串，这个不需要是全部解析之前的源码，只需要是被解析的哪一段源码。
 * @param {*} endIndex 被解析后的位置。
 */
function advancePositionWithMutation(context, source, endIndex) {
    let linesCount = 0; // 计算换行符数量。
    let linePos = -1; // 记录换行的字符位置。
    for (let i = 0; i < endIndex; i++) {
        if (source.charCodeAt(i) == 10) {
            linesCount++;
            linePos = i;
        }
    }
    context.offset += endIndex;
    context.line += linesCount;
    // 如果没有换行就是
    context.column = linePos == -1 ? context.column + endIndex : endIndex - linePos;
}
/**
 * 用于把文本数据截取下来，算是个公用方法。
 * @param {} context 
 * @param {*} endIndex 
 * @returns 
 */
function parseTextData(context, endIndex) {
    const content = context.source.slice(0, endIndex);
    advanceBy(context, endIndex);
    return content;
}
function parseText(context) {
  let tokens =  ['<', '{{'];
  let endIndex = context.source.length; 
  for(let i = 0; i < tokens.length; i++) {
    const index = context.source.indexOf(tokens[i], 1);
    if(index != -1 && endIndex > index) {
      endIndex = index;
    }
  }
  const start = getCursor(context);
  // getCursor当前是解析前的位置。
  let content = parseTextData(context, endIndex); 
  // parseTextData就是解析后的一个位置了。
  return {
    type: NodeTypes.TEXT,
    content: content,
    loc: getSelection(context, start)  
    // loc是当前解析的文本的整体位置。
  }
}
function parseAttributeValue(context) {
    let quote = context.source[0];
    const isQuoted = quote === '"' || quote === "'";
    let content;
    if (isQuoted) {
        advanceBy(context, 1);
        const endIndex = context.source.indexOf(quote, 1);
        content = parseTextData(context, endIndex);
        advanceBy(context, 1);
    }
    else {
        content = context.source.match(/([^ \t\r\n/>])+/)[1];
        advanceBy(context, content.length);
        advanceBySpaces(context);
    }
    return content;
}
function parseAttribute(context) {
    const start = getCursor(context);
    let match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
    const name = match[0];
    let value;
    advanceBy(context, name.length);
    if (/^[ \t\r\n\f]*=/.test(context.source)) {
        advanceBySpaces(context);
        advanceBy(context, 1);
        advanceBySpaces(context);
        value = parseAttributeValue(context);
    }
    let loc = getSelection(context, start);
    return {
        type: NodeTypes.ATTRIBUTE,
        name,
        value: {
            type: NodeTypes.TEXT,
            content: value,
            loc: loc
        },
        loc: getSelection(context, start)
    };
}
function parseAttributes(context) {
    const props = [];
    while (context.source.length > 0 && !context.source.startsWith('>')) {
        props.push(parseAttribute(context));
        advanceBySpaces(context);
    }
    return props;
}
function parseTag(context) {
    const start = getCursor(context);
    const match = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source);
    const tag = match[1];
    
    advanceBy(context, match[0].length); 
    advanceBySpaces(context);
    let props = parseAttributes(context);
    const isSelfClosing = context.source.startsWith('/>');
    advanceBy(context, isSelfClosing ? 2 : 1);
    return {
      type: NodeTypes.ELMENT,
      tag,
      isSelfClosing,
      loc: getSelection(context, start),
      props,
    }
    // return match;
}
function parseElement(context) {
    const ele = parseTag(context);
    const children = parseChildren(context);
    // 处理结束标签。
    if(context.source.startsWith('</')) {
      parseTag(context);
    }
    (ele).children = children;
    (ele).loc = getSelection(context, ele.loc.start);
    return ele;
}
function parseInterpolation(context) {
  const start = getCursor(context);
  const closeIndex = context.source.indexOf('}}', 2);
  advanceBy(context, 2);
  // inner是为了定位准确的插值位置，而并非记录要解析的完整字段。innerEnd在后续会更新更准确的位置值。
  const innerStart = getCursor(context);
  const innerEnd = getCursor(context);
  const rawContentLength = closeIndex - 2;
  let preContent = parseTextData(context, rawContentLength);
  let content = preContent.trim();
  // 就剩innerEnd，因为已经解析到innerEnd。
  // 找出 content 在 preContent 中的精确位置。
  let startOffset = preContent.indexOf(content);
  // 移除插值前的空格的准确位置。
  if(startOffset > 0) {
    advancePositionWithMutation(innerStart, preContent, startOffset);
  }
  
  let endOffset = startOffset + content.length;
  // 移除插值后的空格的准确位置。
  advancePositionWithMutation(innerEnd, preContent, endOffset);
  advanceBy(context, 2);
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
      loc: getSelection(context, innerStart, innerEnd)
    },
    loc: getSelection(context, start)
  }
}
function isEnd(context) {
    const c = context.source;
    if (c.startsWith('</')) {
        return true;
    }
    return !c;
}
/**
 * 整体逻辑就是除了插值和标签之外的都是文本。
 * 整体的解析逻辑是父标签处理子标签，直到遇到自己的结束标签。子标签同理。
 * while标签只有遇到自己的结束标签才会停止，每个子标签都会有自己的while，每个while有自己的nodes。
 * 最外层的while是以解析完成为停止标志。
 * example:
 *  <tempalate a='3' bddaw=4>
    <a><aa></aa></a><b></b>
    </template>
    会有5个while，最外层，template内部，a内部，aa内部，b内部。
    打印顺序是aa内部、a内部、b内部、template内部、最外层。
 * @param context
 * @returns
 */
function parseChildren(context) {
    const nodes = [];
    while (!isEnd(context)) {
        const c = context.source;
        let node;
        if (c.startsWith('{{')) {
            node = parseInterpolation(context);
            break;
        }
        else if (c[0] === '<') {
            node = parseElement(context);
        }
        else {
            node = parseText(context);
        }
        nodes.push(node);
    }
    // 清除无意义的空白文本节点。处理有效文本节点：压缩空白，把‌连续空白字符‌替换为空字符串，相当于压缩掉多余空格。
    // /[\t\r\n\f ]/ 匹配所有空白字符（制表符、回车、换行、空格）。
    // 最后用 filter(Boolean) 过滤掉所有 null 值，只保留有效节点。
    // 
    for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        if (node.type === NodeTypes.TEXT) {
            if (!/[^\t\r\n\f ]/.test(node.content)) {
                nodes[i] = null;
            }
            else {
                node.content = node.content.replace(/[\t\r\n\f ]+/g, "");
            }
        }
    }
    return nodes.filter(Boolean);
}
function createRoot(children) {
    return {
        type: NodeTypes.ROOT,
        children,
    };
}
function createParseContext(content) {
    return {
        originalSource: content,
        source: content,
        line: 1,
        column: 1,
        offset: 0,
    };
}
function parse(template) {
    const context = createParseContext(template);
    return createRoot(parseChildren(context));
}
const template = `
  <tempalate a='3' bddaw=4>
    {{111}}
  </template>
`;
parse(template);
