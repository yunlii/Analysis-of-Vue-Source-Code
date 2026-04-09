const queue = [];
let isFlushing = false;
const resolvePromise = Promise.resolve();

export default function queueJob(job) {
  if(!queue.includes(job)) {    
    queue.push(job);
  }
  if(!isFlushing) {
    isFlushing = true;
    resolvePromise.then(() => {
      isFlushing = false;
      const copy = queue.slice(0);
      queue.length = 0;
      copy.forEach(job => job());
      copy.length = 0;
    })
  }
}