/*
  Basic logging module
*/
fs = require('fs')
var logger = {}
logger.file = 'log.txt';
logger.logLevel = 'debug';  //set a threshold for logging
logger.baseLog = function(level, message) {
  var levels = ['debug','warn','error'];
  if (levels.indexOf(level) >= levels.indexOf(this.logLevel)){
    if (typeof message !== 'string') {
      message = JSON.stringify(message);
    }
    fs.appendFile('./' + logger.file,
                  new Date() + ':' + level + ': ' + message + '\r\n')
  }
}
logger.debug = function(message){ logger.baseLog('debug', message)}
logger.warn = function(message){ logger.baseLog('warn', message)}
logger.error = function(message){ logger.baseLog('error', message)}

module.exports = logger;
