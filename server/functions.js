var githubHeaders = {
  'Authorization': 'token ' + process.env.GITHUB_OAUTH_TOKEN,
  'Accept':'application/json','User-Agent':'grantbachman'
}

function parsePatch(patch){
  var matches = [];
  /*
    key, secret, or token followed by = and at least 15 letters or digits
    up to 1 space between 'key' and '=', and '=' and the key string
    key string must begin with a single or double quote
    everything is case-insensitive
    - captures the key in capture[1]
    - captures the value (the secret key) in capture[2]
    http://regex101.com is awesome!
  */
  var regex = /([-_a-z0-9]+) ?= ?["']?([a-z0-9]{15,})["']/gi;
  while (match = regex.exec(patch)){
    /*
      Left side must not contain 'public' and must contain either 'api',
          'secret', 'key', or 'token'.
      Right side must contain at least one digit
      The Key cannot have been already saved off (same key in multiple )
    */
    if (!/public/i.test(match[1]) &&
        /(?:api|secret|key|token)/i.test(match[1]) &&
        /\d/.test(match[2]) &&
        Commits.find({value: match[2]}).count() == 0
       ){
        matches.push({key: match[1], value: match[2]});
      }
    }
  return matches;
};
// Takes a Commits URL
function parseCommit(url){
    HTTP.call("GET", url, { headers: githubHeaders },
        function(err,obj){
          for (var i = 0; i < obj.data.files.length; i++){
            var datum = obj.data.files[i];
            var matches = parsePatch(datum.patch);
            for (var j = 0; j < matches.length; j++){
              console.log('Link: ' + obj.data.html_url + '  Matches: ' + matches);
              Commits.insert({
                sha: obj.data.sha,
                link: obj.data.html_url,
                key: matches[j]['key'],
                value: matches[j]['value'],
                createdAt: new Date()
              });
          }
        } 
      }
    );
};

launchQuery = function(){
  console.log("Launching Query at " + new Date());
  // token = f076bdca067a9f2a99603b31dfff9295b421c0f2
  HTTP.call("GET","https://api.github.com/events",{headers: githubHeaders},
    function(err,obj){
      console.log('RATE LIMIT REMAINING: ' + obj.headers['x-ratelimit-remaining'] + '\n' +'RATE LIMIT RESETS ON ' + new Date(obj.headers['x-ratelimit-reset'] * 1000))
      for (var i = 0; i < obj.data.length; i++){
        var eventPc = obj.data[i]; 
        if (eventPc.type == 'PushEvent'){
          for (var j = 0; j < eventPc.payload.commits.length; j++){
            var commitUrl = eventPc.payload.commits[j].url 
            parseCommit(commitUrl);
          }
        }
      }
    }
  ); 
};
