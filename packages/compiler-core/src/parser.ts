import { NodeTypes } from "./ast";

function getCursor(context) {
  let { line, column, offset } = context;
  return { line, column, offset }
}

function getSelection(context, start, end?) {
  end = end || getCursor(context);
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset)
  }
}

function advanceBy(context, endIndex) {
  let c = context.source;
  advancePositionWithMutation(context, c, endIndex);
  context.source = c.slice(endIndex);
}

function advanceBySpaces(context) {
  const match = /^[ \t\r\n]/.exec(context.source);
  if(match) {
    advanceBy(context, match[0].length);
  }
}

function advancePositionWithMutation(context, source, endIndex) {
  let linesCount = 0;
  let linePos = -1;
  for(let i = 0; i < endIndex; i++) {
    if(source.charCodeAt(i) == 10) {
      linesCount++;
      linePos = i;
    }
  }
  context.offset += endIndex;
  context.line += linesCount;
  context.column = linePos == -1 ? context.column + endIndex : endIndex - linePos;
}

// function parseText(context) {
//   let tokens =  ['<', '{{'];
//   let endIndex = context.source.length; 

//   for(let i = 0; i < tokens.length; i++) {
//     const index = context.source.indexOf(tokens[i], 1);
//     if(index != -1 && endIndex > index) {
//       endIndex = index;
//     }
//   }

//   const start = getCursor(context);
//   let content = parseTextData(context, endIndex); 
//   return {
//     type: NodeTypes.TEXT,
//     content: content,
//     loc: getSelection(context, start)
//   }
// }

function parseTextData(context, endIndex) {
  const content = context.source.slice(0, endIndex);
  advanceBy(context, endIndex);
  return content;
}

function parseAttributeValue(context) {
  let quote = context.source[0];
  const isQuoted = quote === '"' || quote === "'";

  let content;
  if(isQuoted) {
    advanceBy(context, 1);
    const endIndex = context.source.indexOf(quote, 1);
    content = parseTextData(context, endIndex);
    advanceBy(context, 1);
  } else {
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
  if(/^[ \t\r\n\f]*=/.test(context.source)) {
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
  }
}

function parseAttributes(context) {
  const props = [];
  while(context.source.length > 0 && !context.source.startsWith('>')) {
    props.push(parseAttribute(context));
    advanceBySpaces(context)
  }
  return props;
}

function parseTag(context) {
  const start = getCursor(context);
  const match = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source); 
  // const tag = match[1];
  // advanceBy(context, match[0].length);
  // advanceBySpaces(context);

  // let props = parseAttributes(context);

  // const isSelfClosing = context.source.startsWith('/>');
  // advanceBy(context, isSelfClosing ? 2 : 1);

  // return {
  //   type: NodeTypes.ELMENT,
  //   tag,
  //   isSelfClosing,
  //   loc: getSelection(context, start),
  //   props,
  // }
  return match
}

function parseElement(context) {
  const ele = parseTag(context);
  // const children = parseChildren(context);
  // if(context.source.startsWith('</')) {
  //   parseTag(context);
  // }
  // (ele as any).children = children;
  // (ele as any).loc = getSelection(context, ele.loc.start);

  // return ele;
}




// function parseInterpolation(context) {
//   const start = getCursor(context);
//   const closeIndex = context.source.indexOf('}}', 2);
//   advanceBy(context, 2);
//   const innerStart = getCursor(context);
//   const innerEnd = getCursor(context);
//   const rawContentLength = closeIndex - 2;
//   let preContent = parseTextData(context, rawContentLength);
//   let content = preContent.trim();
//   let startOffset = preContent.indexOf(content);
//   if(startOffset > 0) {
//     advancePositionWithMutation(innerEnd, preContent, startOffset);
//   }
//   let endOffset = startOffset + content.length;
//   advancePositionWithMutation(innerEnd, preContent, endOffset);
//   advanceBy(context, 2);
//   return {
//     type: NodeTypes.INTERPOLATION,
//     content: {
//       type: NodeTypes.SIMPLE_EXPRESSION,
//       content,
//       loc: getSelection(context, innerStart, innerEnd)
//     },
//     loc: getSelection(context, start)
//   }
// }

function isEnd(context) {
  const c = context.source;
  if(c.startsWith('</')) {
    return true;
  }
  return !c;
}

/**
 * @param context 
 * @returns 
 */
function parseChildren(context) {
  const nodes = [] as any;
  while(!isEnd(context)) {
    const c = context.source;
    let node;
    if(c.startsWith('{{')) {
      // node = parseInterpolation(context);
      break;
    } else if(c[0] === '<') {
      node = parseElement(context);
    } else {
      // node = parseText(context);
    }
    nodes.push(node);
  }
  // 清除无意义的空白文本节点。处理有效文本节点：压缩空白，把‌连续空白字符‌替换为空字符串，相当于压缩掉多余空格。
  // /[\t\r\n\f ]/ 匹配所有空白字符（制表符、回车、换行、空格）。
  // 最后用 filter(Boolean) 过滤掉所有 null 值，只保留有效节点。
  for(let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if(node.type === NodeTypes.TEXT) {
      if(!/[^\t\r\n\f ]/.test(node.content)) {
        nodes[i] = null;
      } else {
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
  }
}

function createParseContext(content) {
  return {
    originalSource: content,
    source: content,
    line: 1,
    column: 1,
    offset: 0,
  }
}

function parse(template) {
  const context = createParseContext(template);
  return createRoot(parseChildren(context));
}

const template = `
  <tempalate>
    <div><p></p><span></span></div>
  </template>
`;

parse(template)