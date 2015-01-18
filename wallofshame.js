Commits = new Mongo.Collection("commits");

Router.configure({ layoutTemplate: 'Base' });
//Router.route('/about', function(){ this.render('About'); }, { name: 'About' });
Router.route('/', function(){ this.render('Home'); }, { name: 'Home' });

if (Meteor.isClient) {

  Session.setDefault('commitsCursor',20);

  Meteor.autorun(function(){
    Meteor.subscribe('commits', Session.get('commitsCursor'));
  });
  
  // Highlights the active tab in the navigation bar
  Template.Navigation.helpers({
    activeIfTemplateIs: function(template){
      var currentRoute = Router.current().route.getName();
      return currentRoute && 
        template == currentRoute ? 'active' : '';
    }
  });

  Template.Home.events({
    'click .older': function(evt, tmpl){
      Session.set('commitsCursor', Number(Session.get('commitsCursor')) + 20);
    }
  });

  Template.Home.helpers({
    commits: function() {
      return Commits.find({}, {sort: {createdAt: -1}});
    }
  });
  
  Template.Commit.helpers({
    humanReadableDate: function(){
                         return moment(this.createdAt).fromNow();
                       }
  });

}


if (Meteor.isServer) {

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
}

