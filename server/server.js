//Commits = new Mongo.Collection("commits");

SyncedCron.options = { log: true, collectionName: 'jobs'}
SyncedCron.add({
  name: 'Poll GitHub API ever 25 seconds',
  schedule: function(parser){ return parser.text('every 25 seconds'); },
  job: function() {
      launchQuery();
      return 1;
  }
})

Meteor.publish('commits',function(commitsCursor){
  return Commits.find({},{sort: {createdAt: -1},
                        limit: commitsCursor});
})

Meteor.startup(function() {
  SyncedCron.start();
})
