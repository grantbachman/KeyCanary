var logger = require('./logger')
require('./githubIssues');
var GitHubAPI = require("github");
var github = new GitHubAPI({ version: "3.0.0"});

// Set it up.
logger.logLevel = 'debug';
github.authenticate({type:"oauth", token: process.env.GITHUB_OAUTH_TOKEN});

// Query for our rate limit remaining 
logger.debug('Starting script...');
github.misc.rateLimit({},function(err,msg){ 
  var coreLimit = msg.resources.core;
  logger.debug('API Calls Remaining: ' + coreLimit.remaining);
  logger.debug('API Limit Resets on: ' + new Date(coreLimit.reset*1000));
  if (coreLimit < 100){
    logger.debug('Not Launching - not enough API calls');
    return;
  }
  github.events.get({per_page:100}, eventsCallback);
});

// wait 20 seconds before closing.
setTimeout(function(){ db.close(); logger.debug('Stopping script...')}, 20000);

function eventsCallback(err, events){
  if(err){
    logger.error('Error querying GitHub Events API: ' + JSON.stringify(err))
    return;
  }
  events.forEach(function(eventPc){
    if(eventPc.type == 'PushEvent'){
      eventPc.payload.commits.forEach(function(commit){
        var sha = commit.sha;
        var info = getInfoFromURL(commit.url)
        // parse each individual commit
        github.repos.getCommit({user:info.user, repo:info.repo, sha:sha}, parseCommit);
      });
    }
  })
}

function getInfoFromURL(url){
  // Grabs the User/Repo from a repo URL
  // returns an object with keys 'user' and 'repo'
  var urlArr = url.split('/');
  var userIndex = urlArr.indexOf('repos') + 1;
  var user = urlArr[userIndex],
      repo = urlArr[userIndex + 1];
  return { user: user, repo: repo }
}


function parseCommit(err, commit){
  if(err){ 
    logger.error('Error parsing commit: ' + JSON.stringify(err));
    return;
  }
  var first = true;
  var info = getInfoFromURL(commit.url)
  info.sha = commit.sha;
  commit.files.forEach(function(file){
    info.file = file.filename;
    var matches = parsePatch(file.patch);  // try to find secret keys 
    if(matches.length > 0){
      matches = matches[0]; // keep it to one match at a time for now..
      // Before going hogwild, only send one message per user for right now
      // ...meaning we won't actually check if they want us to STOP yet.
      Issues.find({user: info.user}).limit(1, function(err, docArr){
        if(docArr.length == 0){
          var msg = assembleMsg(info);
          // post the issues to my issue list first.
          msg['user'] = 'grantbachman';
          msg['repo'] = 'wallofshame';

          // For testing. making sure it won't save more than one per user
          Issues.insert({ user: info.user, repo: info.repo, sha:info.sha});
          //
          github.issues.create(msg, saveIssueDetails)
          logger.warn('Creating issue for ' + JSON.stringify(info) + ". Key found: " + JSON.stringify(matches));
        }
      })
    }
    else {
      logger.debug('No issue created for ' + JSON.stringify(info))
    }
  });
}

function saveIssueDetails(err, issue){
  info = getInfoFromURL(issue.url);
  Issues.insert({ user: info.user, repo: info.repo, number: issue.number});
  if(err) console.log(err);
  if(issue) console.log(issue);
}

function assembleMsg(info){
  var obj = {};
  obj['labels'] = ['security'];
  obj['user'] = info.user;
  obj['repo'] = info.repo;
  obj['title'] = "Possible security issue";
  obj['body'] = "Hello!\
    I'm the Key Canary. You just committed\
    some code in " + info.sha + " that looks\
    to contain a secret key. If this is the case, that secret key is now\
    compromised, and you'll want to generate a new set of credentials\
    for the service.\
    \n\nBest practice is to store these keys in an environment variable\
    and reference that variable in your code. If that's not an option, you\
    can store them in a config file, making sure to add that file to your\
    .gitignore before committing. If you have any questions about how to\
    do this, feel free to send me an email.\
    \n\nThis is an automated message. To stop receiving these in the future,\
    just reply to this issue with *STOP*"
  return obj; 
}


/*
Left side must not contain 'public' and must contain either 'api',
    'secret', 'key', or 'token'.
Right sides length must contain at least 25% numbers
*/
function isValidMatch(match){
  return !/public/i.test(match[1]) && 
    /(?:api|secret|key|token)/i.test(match[1]) &&
    match[2].replace(/[^0-9]/g,"").length > (match[2].length / 4)
}
   
/*
  key, secret, or token followed by = and at least 15 letters or digits
  up to 1 space between 'key' and '=', and '=' and the key string
  key string must begin with a single or double quote
  everything is case-insensitive
  - captures the key in capture[1]
  - captures the value (the secret key) in capture[2]
  http://regex101.com is awesome!
*/
function parsePatch(patch){
  var matches = [];
  var regex = /([-_a-z0-9]+) ?= ?["']?([a-z0-9]{15,})["']/gi;
  while (match = regex.exec(patch)){
    if (isValidMatch(match)){
      matches.push({key: match[1], value: match[2]});
    }
  }
  return matches;
};
