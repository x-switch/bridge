const state = {
  init:false,
  events: new Set(),
  callbacks: {},
  allCallbacks: []
}

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function handleOnMessage(event) {
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

function sendAll(eventName, data) {
  state.allCallbacks.forEach(callback => callback(eventName, data))
}

export function on(eventName, callback, context) {
  const scope = { callback, context }

  if (!state.events.has(eventName)) {
    state.events.add(eventName);
    state.callbacks[eventName] = [scope];
  } else {
    state.callbacks[eventName].push(scope)
  }
}

export function once(eventName, callback, context) {
  const onceCallback = (...args) => {
    off(eventName, onceCallback);
    return callback(...args);
  };

  on(eventName, onceCallback, context);
}

export function off(eventName, callback) {
  if (state.events.has(eventName)) {
    if (!callback) {
      state.events.delete(eventName);
      state.callbacks[eventName] = [];
    } else {
      state.callbacks[eventName].filter((item) => item.callback !== callback);
    }
  }
}

export function onAll(callback) {
  state.allCallbacks.push(callback)
}

export function offAll(callback) {
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

export function invoke(eventName, eventData) {
  return new Promise((resolve, reject) => {
    const id = uuidv4()
    const message = {
      eventType: 'invoke',
      eventId: id,
      eventName,
      eventData,
    }
    const onMessage = (event) => {
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

export function handle(eventName, callback) {
  const id = uuidv4()
  const handleMessage = {
    eventType: 'handle',
    eventId: id,
    eventName,
  }
  const onMessageRequest = (event) => {
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

export function emit(eventName, eventData) {
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
