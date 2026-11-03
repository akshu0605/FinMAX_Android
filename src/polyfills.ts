type IteratorPrototypeWithJoin = Iterator<unknown> & {
  join?: (separator?: string) => string;
};

type IteratorConstructorLike = {
  prototype: IteratorPrototypeWithJoin;
};

const globalObject = globalThis as typeof globalThis & {
  Iterator?: IteratorConstructorLike;
};

if (typeof globalObject.Iterator === 'undefined') {
  const arrayIteratorPrototype = Object.getPrototypeOf([][Symbol.iterator]());
  const iteratorPrototype = Object.getPrototypeOf(arrayIteratorPrototype) as IteratorPrototypeWithJoin;
  const IteratorPolyfill = function Iterator(): never {
    throw new TypeError('Iterator is an abstract base and cannot be constructed directly');
  };

  Object.defineProperty(IteratorPolyfill, 'prototype', { value: iteratorPrototype });
  Object.defineProperty(globalObject, 'Iterator', {
    configurable: true,
    writable: true,
    value: IteratorPolyfill as unknown as IteratorConstructorLike,
  });
}

const iteratorPrototype = globalObject.Iterator!.prototype;
if (typeof iteratorPrototype.join !== 'function') {
  Object.defineProperty(iteratorPrototype, 'join', {
    configurable: true,
    writable: true,
    value(this: Iterator<unknown>, separator?: string) {
      const values: unknown[] = [];
      let step = this.next();
      while (!step.done) {
        values.push(step.value);
        step = this.next();
      }
      return values.join(separator);
    },
  });
}

type PromiseResolvers<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

type PromiseConstructorWithResolvers = typeof Promise & {
  withResolvers?: <T>() => PromiseResolvers<T>;
};

const promiseConstructor = Promise as PromiseConstructorWithResolvers;
if (typeof promiseConstructor.withResolvers !== 'function') {
  Object.defineProperty(promiseConstructor, 'withResolvers', {
    configurable: true,
    writable: true,
    value<T>(): PromiseResolvers<T> {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
      });
      return { promise, resolve, reject };
    },
  });
}
