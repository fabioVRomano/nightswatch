const duration = require('parse-duration');
const yaml = require('js-yaml');
const fs = require('fs');
const set = require('lodash.set');
const get = require('lodash.get');
const merge = require('lodash.merge');
const toNum = require('lodash.tonumber');
const debug = require('debug')('nightswatch:conf');

const defaultsConfig = yaml.safeLoad(
  fs.readFileSync('./src/config.defaults.yaml', 'utf8')
);
const userConf =
  fs.existsSync(process.env.CONFIG_FILE || './config.yaml') &&
  yaml.safeLoad(
    fs.readFileSync(process.env.CONFIG_FILE || './config.yaml', 'utf8')
  );

function configurator(...configurations) {
  const extConfs = {};

  /**
   *
   * @param {string} propPath property path cookie.maxAge
   */
  function envOverride(propPath) {
    let value;
    const propENV = propPath.replace('.', '__').toUpperCase();
    if (process.env[propENV]) {
      value = process.env[propENV];
    } else if (process.env[`${propENV}_0`]) {
      value = [];
      while (process.env[`${propENV}_${value.length}`]) {
        value.push(process.env[`${propENV}_${value.length}`]);
      }
    }
    if (value) {
      set(extConfs, propPath, value);
    }
  }
  function required(propPath) {
    if (!get(extConfs, propPath)) {
      throw Error(`${propPath} is required!`);
    }
  }

  function humanToMillis(propPath) {
    const humanValue = get(extConfs, propPath);
    if (humanValue) {
      set(extConfs, propPath, duration(humanValue));
    }
  }

  function toBoolean(propPath) {
    const stringValue = get(extConfs, propPath);
    switch (stringValue) {
      case true:
      case 'true':
      case 1:
      case '1':
      case 'on':
      case 'yes':
        set(extConfs, propPath, true);
        break;
      default:
        set(extConfs, propPath, false);
    }
  }

  function toNumber(propPath) {
    const stringValue = get(extConfs, propPath);
    set(extConfs, propPath, toNum(stringValue));
  }

  function inRange(propPath, min, max) {
    const numberValue = get(extConfs, propPath);
    if (min >= numberValue || max <= numberValue) {
      throw Error(
        `${propPath} [${numberValue}] is out of allowed range ${min} <-> ${max}!`
      );
    }
  }
  merge(extConfs, ...configurations);

  envOverride('oidc.issuerUri');
  required('oidc.issuerUri');
  envOverride('oidc.client_id');
  required('oidc.client_id');
  envOverride('oidc.client_secret');
  required('oidc.client_secret');
  envOverride('oidc.redirect_uri');
  envOverride('oidc.scopes');

  envOverride('cookie.name');
  envOverride('cookie.keys');
  envOverride('cookie.maxAge');
  humanToMillis('cookie.maxAge');
  required('oidc.client_secret');

  envOverride('targets.upstream');

  envOverride('storage.kind');
  envOverride('storage.specs.stdTTL');

  envOverride('server.http.enable');
  toBoolean('server.http.enable');
  envOverride('server.http.port');
  toNumber('server.http.port');
  inRange('server.http.port', 1, Math.pow(2, 16) - 1);

  envOverride('server.max_body_limit');
  envOverride('server.proxy');
  envOverride('server.max_header_size');
  envOverride('server.healthcheck.readiness');
  envOverride('server.healthcheck.liveness');
  envOverride('server.healthcheck.timeout');
  humanToMillis('server.healthcheck.timeout');

  envOverride('relying_party.on_success_redirect');
  envOverride('relying_party.on_fail_redirect');
  envOverride('relying_party.oidc_base_path');
  envOverride('relying_party.oidc_paths.login');
  envOverride('relying_party.oidc_paths.callback');
  envOverride('relying_party.headers.prefix');
  //TBC   envOverride('relying_party.headers.proxy');

  debug(extConfs);
  return extConfs;
}

module.exports = configurator(defaultsConfig, userConf);
