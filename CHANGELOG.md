# Changelog

## [1.0.0] Initial release

### Features

- v1 manifest specification
- typescript command line tool `filecoin-prep`
   - `pack` command to prepare dataset files for Filecoin deals, creates manifests
   - `unpack` command to unpack deal datatset files, verified using manifests
   - `ls` command to list contents of packed dataset files
   - `verify` command to verify packed dataset files without unpacking
- unit testing with jest
- system testing with jest
- code formatting support
