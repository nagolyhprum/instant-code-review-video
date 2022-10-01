# instant-code-review-video
Generate a video from a git diff that looks like you are editing the code in real time.

## Motivation
Code reviews can be boring. There is no way to know what order the coder made the changes or their reasoning for doing so. That is the problem this tool will solve.

### MVP
* ~~User can choose a local repository~~
* ~~User can choose a branch (not main)~~
* The tool will auto generate the steps to make those changes
* The user can show the results at each step
* User can split and reorder the steps
* When they press play they see a video of code being edited live
* User can overlay their voice and background music
* User can save files

### Future
* User can choose remote pull requests
* Add syntax highlighting

## Goal
Allow users to quickly make videos to share on their code reviews in order to make code reviews more interactive and fun. It would also help future developers when reviewing blames in order to determine the reasoning for changes made in the past.

### Project Stack
* Electron
* Typescript
* React
