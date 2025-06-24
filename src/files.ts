import { FileLike, filesFromPaths } from "files-from-path";

export interface SplitFileLike extends FileLike {
  originalName: string;
  offset: number;
}

/* iterateFilesFromPathsWithSize
 * This function takes an array of file paths and yields batches of files
 * where each batch does not exceed a specified size limit (default is 31 GiB).
 * Each yielded batch is an array of SplitFileLike objects.
 *
 * Note: This implementation does not yet split files, it will yield full files
 * only and throw an exception if a file is too big.
 *
 * @param {string[]} filePaths - Array of file paths to process.
 * @param {number} nBytes - Maximum size in bytes for each batch (default: 31 GiB).
 * @returns {AsyncGenerator<SplitFileLike[]>} - An async generator yielding batches of files.
 */

export const iterateFilesFromPathsWithSize = async function* (
  filePaths: string[],
  nBytes = 31 * 1024 * 1024 * 1024
): AsyncGenerator<SplitFileLike[], void, void> {
  const allFiles = await filesFromPaths(filePaths);
  let bytes = 0;
  const files: SplitFileLike[] = [];

  for (const file of allFiles) {
    if (bytes + file.size > nBytes) {
      yield files;
      bytes = 0; // Clear the array for the next batch
      files.length = 0; // Reset the files array
      if (file.size > nBytes) {
        // TODO: split the file here
        throw new Error(
          `File ${file.name} is too large (${String(file.size)} bytes) to fit in a single batch of ${String(nBytes)} bytes.`
        );
      }
    }
    const splitFile: SplitFileLike = {
      ...file,
      originalName: file.name,
      offset: 0, // Offset is 0 for the first part of a split file
    };
    files.push(splitFile);
    bytes += file.size;
  }
  yield files; // Yield the last batch of files
};
