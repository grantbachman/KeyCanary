var async = require("async");
var logger = require('./logger')
var GitHubAPI = require("github");
var github = new GitHubAPI({ version: "3.0.0"});
github.authenticate({type:"oauth", token: process.env.GITHUB_OAUTH_TOKEN});
var mongojs = require("mongojs");
db = mongojs("mongodb://localhost:27017/keycanary");

/*
 * Exposes the following:
 *
 *   isUserBlacklisted - Given a user, checks all of the alerts we've sent them
 *                        and calls the GitHub API to see if they've unsubscribed
 *                        in any of the issues we've opened.
 *   Issues - A reference to the Issues collection.
*/



// Ensure it's working
db.runCommand({ping:1}, function(err, res) {
      if(!err && res.ok) logger.debug("Connected to mongo database.");
});

Issues = db.collection('issues');

function isStopInComments(comments){
  // Check all the comments for STOP
  // Not sure which user I'm looking for as a repo can have multiple
  // contributors... I'll leave that part out for now.
  return comments.some(function(comment){ return comment.body.toUpperCase().indexOf('STOP') > 0;});
}

isUserBlacklisted = function(user, topCallback){
  // Grab each issue we've  to that user,
  // see if any of their comments are 'STOP'
  Issues.find({user: user, isBlacklisted: true}).count(function(err, num) {
    if (num > 0){
      topCallback(true);
    }
    else {
      Issues.find({ user: user }).toArray(function(err, issues) {
        if(messages.length == 0) {
          topCallback(false)
        }
        else{
          async.each(issues, function(issues, callback){
            var options = {
              user: issue.user,
              repo: issue.repo,
              number: issue.number
            }
            github.issues.getComments(options, function(err,obj) {
              console.log("Made a call to github for issue #" + issue.number);
              if (isStopInComments(obj)){
                Issues.update(options, {$set:{isBlacklisted: true}});
                callback(true)
              }
              else {
                callback(null);
              }
            });
          },
          function(err) { 
            if(err == true) {
              topCallback(true);
            }
            else {
              callback(false);
            }
          });
        }
      });
    }
  });
}
