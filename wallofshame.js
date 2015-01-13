Tasks = new Mongo.Collection("tasks");

if (Meteor.isClient) {

  Template.body.helpers({
    tasks: function() {
      return Tasks.find({}, {sort: {createdAt: -1}});
    }
  });

  Template.body.events({
      "submit .new-task": function (event){
          var text = event.target.text.value;
          Tasks.insert({
              text: text,
              createdAt: new Date()
          });
          event.target.text.value = "";
          return false;
      }
  });

}
SyncedCron.options = { log: true, collectionName: 'jobs'}
SyncedCron.add({
  name: 'Poll GitHub API ever 25 seconds',
  schedule: function(parser){ return parser.text('every 25 seconds'); },
  job: function() {
      launchQuery();
      return 1;
  }
})

if (Meteor.isServer) {
  Meteor.startup(function() {
  //SyncedCron.start();
  })
}
