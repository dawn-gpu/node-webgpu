# PUBLISHING

node-webgpu is auto published via github actions to npm whenever a tag
is pushed to the repository.

The steps in general are:

```bash
git remote add upstream git@github.com/dawn-gpu/node-webgpu.git
# update the repo
# run the tests
npm version patch # or minor or major
git push --tag upstream main
```

That should build all 4 platforms and then publish a new package
on npm. At the time of this writing that generally takes 20-30 minutes.

## Notes

### No tests on CQ

github actions doesn't currently run any tests as there is no GPU
so run tests locally before pushing the patch.

### npm permissions

The github action publishes to npm via the `JS-DevTools/npm-publish`
action. See `.github/workflows/build.yml`. This uses github
secret named `NPM_TOKEN` which is stored and unrecoverable in
the repo's settings. To change it, an admin of this project,
and of the npm project would go to npm, generate a new token,
then copy it into the github settings for this project.

* getting a token for npm: https://docs.npmjs.com/creating-and-viewing-access-tokens
* adding secret to github: https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions
