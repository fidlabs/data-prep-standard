# How to contribute to data-prep-standard

## **Did you find a bug?**

* **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/fidlabs/data-prep-standard/issues).

* If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/fidlabs/data-prep-standard/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample** or an **executable test case** demonstrating the expected behavior that is not occurring.

## **Did you write a patch that fixes a bug?**

* Open a new GitHub pull request with the patch.

* Ensure the PR description clearly describes the problem and solution. Include the relevant issue number if applicable.

## **Do you intend to add a new feature or change an existing one?**

* Suggest your change in the ?? and start writing code.

* Do not open an issue on GitHub until you have collected positive feedback about the change. GitHub issues are primarily intended for bug reports and fixes.

## Building and testing

The `filecoin-prep` tool is written in Typescript and uses a standard node tooling.  Development is expected to be performed on recent Linux or Mac OS.

### unit tests

Unit tests should be run before submitting a PR.

`npm run test`

We aim for ??% coverage with the unit tests, less than this and your PR will likely be rejected

### build

`npm run build`

### system test

Note that the system tests are run using and against the build output, so remember to `npm run build` before system testing

`npm run test:system`

### linting and formatting

All code must pass linting checks before a PR can be merged.  Run the formatter to automatically fix formatting

`npm run format`

Or run the linters directly if you want to see issues without automatic fixes being applied

`npm run lint && npm run prettier`

Note that linting failures will fail the CI build and prevent PR merging.



Thanks!

FIDL Team
