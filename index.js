const fs = require('fs');
const path = require('path');
const { extendConfig } = require('hardhat/config');

const { HardhatPluginError } = require('hardhat/plugins');

const {
  TASK_COMPILE,
} = require('hardhat/builtin-tasks/task-names');

extendConfig(function (config, userConfig) {
  config.abiExporter = Object.assign(
    {
      path: './abi',
      clear: false,
      flat: false,
      only: [],
      except: [],
    },
    userConfig.abiExporter
  );
});

task(TASK_COMPILE, async function (args, hre, runSuper) {
  const config = hre.config.abiExporter;

  await runSuper();

  const outputDirectory = path.resolve(hre.config.paths.root, config.path);

  if (!outputDirectory.startsWith(hre.config.paths.root)) {
    throw new HardhatPluginError('resolved path must be inside of project directory');
  }

  if (outputDirectory === hre.config.paths.root) {
    throw new HardhatPluginError('resolved path must not be root directory');
  }

  if (config.clear) {
    fs.rmdirSync(outputDirectory, { recursive: true });
  }

  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  for (let absolutePath of await hre.artifacts.getArtifactPaths()) {
    const relativePath = absolutePath.replace(`${ hre.config.paths.artifacts }/`, '');

    if (config.only.length && !config.only.some(m => relativePath.match(m))) continue;
    if (config.except.length && config.except.some(m => relativePath.match(m))) continue;

    const { abi } = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));

    if (!abi.length) continue;

    const destination = path.resolve(
      outputDirectory,
      config.flat ? path.basename(relativePath) : relativePath
    );

    if (!fs.existsSync(path.dirname(destination))) {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
    }

    fs.writeFileSync(destination, `${ JSON.stringify(abi, null, 2) }\n`, { flag: 'w' });
  }
});
