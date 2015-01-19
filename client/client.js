Router.route('/', function(){ this.render('Home') }, { name: 'Home' });
Router.configure({ layoutTemplate: 'Base' });
//Router.route('/', function(){ this.render('Home') }, { name: 'Home' });
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
