/* eslint-disable n/no-unsupported-features/node-builtins */

import { ReadableStream } from "node:stream/web";

/* We collect up the serialised JSON in chunks of 32KB, which is a reasonable size for
 * streaming JSON data to disk efficiently without exhausting memory.
 * We could move the "chunker" out into a separate TransformStream, but this is, overall
 * considered to be simpler.
 */
const defaultChunkSize = 32 * 1024;

/*
 * Creates a ReadableStream from an object, yielding a JSON encoding of the object.
 * This is useful for converting large objects to JSON without exhausting memory.
 *
 * @param obj - The object to convert to a ReadableStream.
 * @returns A ReadableStream that yields JSON strings of the object.
 */
export function JSONReadableStreamFromObject(
  obj: object,
  options: { chunkSize?: number } = {}
): ReadableStream {
  const generator = enqueueObject(obj, { indent: 2 }, 0);
  let overspill = "";

  return new ReadableStream({
    // pull(controller: ReadableStreamDefaultController<Uint8Array>) {
    //   let more = true;

    //   // while (more && controller.desiredSize && controller.desiredSize > 0) {
    //     const { value } = generator.next();

    //     if (value) {
    //       controller.enqueue(Buffer.from(value));
    //     } else {
    //       controller.close();
    //       // more = false;
    //     }
    //   // }
    // },

    pull(controller: ReadableStreamDefaultController<Uint8Array>) {
      let more = true;
      const chunkSize = options.chunkSize ?? defaultChunkSize;
      const buffer = Buffer.alloc(chunkSize);
      let offset = 0;

      if (overspill.length > 0) {
        buffer.write(overspill);
        offset = overspill.length;
        overspill = "";
      }

      while (more && controller.desiredSize && controller.desiredSize > 0) {
        const { value, done } = generator.next();

        if (value) {
          if (value.length > chunkSize) {
            // It would be possible to split the value into chunks, but it is very unlikely that
            // will ever be needed (that would only be for very small chunks)
            throw new Error(
              `JSONReadableStreamFromObject: value length ${String(value.length)} exceeds chunk size ${String(chunkSize)}`
            );
          }

          const written = buffer.write(value, offset);
          if (written < value.length) {
            controller.enqueue(buffer);
            overspill = value.slice(written);
            more = false;
          } else {
            offset += value.length;
          }
        }

        if (!value || done) {
          if (offset > 0) {
            controller.enqueue(buffer.subarray(0, offset));
          }
          controller.close();
          more = false;
        }
      }
    },
  });
}

function getIndent(indent: number, level: number): string {
  let res = "";
  for (let idx = 0; idx < indent * level; idx++) {
    res += " ";
  }
  return res;
}

function* enqueueObject(
  obj: object,
  options: { indent: number },
  level: number
): Generator<string, void> {
  const nl = options.indent > 0 ? "\n" : "";
  const space = options.indent > 0 ? " " : "";
  const indentation = getIndent(options.indent, level);
  const indentation2 = getIndent(options.indent, level + 1);
  yield `{`;
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const value = obj[k as keyof typeof obj];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!value) {
      // don't try and JSONify undefined values, just leave the key out of the JSON object
      continue;
    }
    // console.log("+");
    yield `${nl}${indentation2}"${String(k)}":${space}`;
    yield* enqueueValue(value, options, level + 1);
    if (i + 1 < keys.length) {
      yield ",";
    }
  }
  yield `${nl}${indentation}}`;
}

function* enqueueValue(
  value: unknown,
  options: { indent: number },
  level: number
): Generator<string, void> {
  const nl = options.indent > 0 ? "\n" : "";
  // const space = options.ident > 0 ? ' ' : '';
  const indentation = getIndent(options.indent, level);
  const indentation2 = getIndent(options.indent, level + 1);

  const type = Object.prototype.toString.call(value);
  switch (type) {
    case "[object Array]":
      yield `[`;
      const array = value as unknown[];
      for (let i = 0; i < array.length; i++) {
        yield `${nl}${indentation2}`;
        yield* enqueueValue(array[i], options, level + 1);
        if (i + 1 < array.length) {
          yield ",";
        }
      }
      yield `${nl}${indentation}]`;
      break;
    case "[object Object]":
      yield* enqueueObject(value as object, options, level);
      break;
    case "[object Number]":
    case "[object Boolean]":
    case "[object String]":
    case "[object Date]":
    case "[object Null]":
    case "[object Undefined]":
    default:
      yield JSON.stringify(value);
  }
}
