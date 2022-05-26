type Callback<TData, TContext> = (data?:TData | unknown, context?:TContext | unknown)=>void
interface ScopeCallback<TData,TContext> {
  context: TContext,
  callback:Callback<TData,TContext>
}
interface State {
  init: boolean;
  events: Set<string>;
  callbacks: {
    [eventName: string]: ScopeCallback<unknown,unknown>[]
  }
  allCallbacks: Callback<unknown,unknown>[]
}

const state:State = {
  init:false,
  events: new Set(),
  callbacks: {},
  allCallbacks: []
}

function uuidv4() {

  return (String([1e7]) + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c:string) =>
    (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16)
  );
}

function handleOnMessage(event:MessageEvent) {
  const { data } = event
  const { eventType, eventName, eventData } = data;
  if (eventType === 'emit') {

    sendAll(eventName, eventData);

    if (state.events.has(eventName)) {

      state.callbacks[eventName]
        .forEach(element =>
          element.callback(eventData, element.context)
        );
    }
  }
}

function sendAll(eventName:string, data:unknown) {
  state.allCallbacks.forEach(callback => callback(eventName, data))
}

export function on<TData,TContext>(eventName:string, callback:Callback<TData,TContext>, context:TContext) {
  const scope:ScopeCallback<TData,TContext> = {
    context,
    callback,
  }

  if (!state.events.has(eventName)) {
    state.events.add(eventName);
    state.callbacks[eventName] = [scope];
  } else {
    state.callbacks[eventName].push(scope)
  }
}

export function once<TData,TContext>(eventName:string, callback:Callback<TData,TContext>, context:TContext) {
  const onceCallback:Callback<TData,TContext> = (data,context) => {
    off(eventName, onceCallback);
    return callback(data,context);
  };

  on<TData,TContext>(eventName, onceCallback, context);
}

export function off(eventName:string, callback?:Callback<unknown,unknown>) {
  if (state.events.has(eventName)) {
    if (!callback) {
      state.events.delete(eventName);
      state.callbacks[eventName] = [];
    } else {
      state.callbacks[eventName].filter((item) => item.callback !== callback);
    }
  }
}

export function onAll(callback:Callback<unknown,unknown>) {
  state.allCallbacks.push(callback)
}

export function offAll(callback:Callback<unknown,unknown>) {
  state.allCallbacks = state.allCallbacks.filter((item) => item !== callback);
}

export function clear() {
  state.events.clear();
  state.callbacks = {};
  state.allCallbacks = [];
}

export function start (){
  if(!state.init){
    state.init = true;
    window.addEventListener('message', handleOnMessage)
  }
}

export function stop (){
  if( state.init) {
    state.init = false;
    window.removeEventListener('message', handleOnMessage)
  }
}

export function invoke(eventName:string, eventData:unknown) {
  return new Promise((resolve, reject) => {
    const id = uuidv4()
    const message = {
      eventType: 'invoke',
      eventId: id,
      eventName,
      eventData,
    }
    const onMessage = (event:MessageEvent) => {
      const { source, data } = event
      if (data.eventId === id) {
        if (data.eventError) {
          reject(data.eventError)
        } else {
          resolve(data.eventData)
        }
      }
      window.removeEventListener('message', onMessage);
    }
    window.addEventListener('message', onMessage)
    window.parent.postMessage(message, '*')
  })
}

export function handle<TData, TContext>(eventName:string, callback:Callback<TData,TContext>) {
  const id = uuidv4()
  const handleMessage = {
    eventType: 'handle',
    eventId: id,
    eventName,
  }
  const onMessageRequest = (event:MessageEvent) => {
    if (event.data.eventId === id) {
      if (event.data.eventType === 'handle-request') {
        const handle = () => Promise.resolve(
          callback(
            event.data.eventData,
            event.data.eventContext,
          )
        )

        handle()
          .then((data) => {
            window.parent.postMessage({
              eventType: 'handle-response-success',
              eventId: id,
              eventName,
              eventData: data,
            }, '*')
          })
          .catch(error => {
            window.parent.postMessage({
              eventType: 'handle-response-failure',
              eventId: id,
              eventName,
              eventError: error,
            }, '*')
          })
      }
    }
  }
  window.addEventListener('message', onMessageRequest)
  window.parent.postMessage(handleMessage, '*')
}

export function emit(eventName:string, eventData:unknown) {
  const message = {
    eventType: 'emit',
    eventName,
    eventData,
  }
  window.parent.postMessage(message, '*')
}

const bridge = {
  on,
  once,
  onAll,
  clear,
  invoke,
  handle,
  emit,
}

start();

export default bridge
