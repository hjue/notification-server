
function authorize() {
  return function(handshakeData,callback){
    var cookies = {};
    handshakeData.headers.cookie && handshakeData.headers.cookie.split(';').forEach(function( cookie ) {
      var parts = cookie.split('=');
      cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
    });
    var username = cookies['UserName'];
    if (username) username = username.toLowerCase();
    var userinfo = cookies['UserInfo'];      
    if (!username) {
        callback(null, false);
    }else
    {
      handshakeData['username'] = username;
      callback(null, true);      
    }
  };
}
exports.authorize = authorize;