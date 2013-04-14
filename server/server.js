/*
NODE_ENV=production node app.js > app_log.log 2> app_err.log
export NODE_ENV=production
*/
var PORT = 8080;
var count = 0;
var users = {};
process.setMaxListeners(0);
process.on('uncaughtException', function (err) {
   console.error('uncaughtException:' + err.stack);
});
var config = require('./config.js');
var auth = require('./authorize.js')
var redis = require('redis');
var generic_pool = require('generic-pool');
var redis_pool = generic_pool.Pool({
  name: 'redis pool',
  idleTimeoutMillis : 30000,
  max: 100,
  create: function(callback) {
      var client = redis.createClient(config.redis.port,config.redis.hostname);
      callback(null, client);  
  },
  destroy: function(redisClient) {
      redisClient.quit();
  },
  log : false,
});

var io = require('socket.io').listen(PORT); 

io.configure('development', function(){ 
  io.set('log level', 3);
});
io.configure('production', function(){ 
  io.set('log level', 1);
  console.info = function() {}
}); 

io.configure(function (){  
  io.set('authorization',auth.authorize());
});


var online = io.of('/online');
online.on('connection', function (socket) {
  console.info('+ User '+ socket.handshake.username +' connected ('+ socket.handshake.address.address +').  ' +' at ' + new Date().toString());
  var currentUser = {
          ip:socket.handshake.address.address
      };
  count++;
  if (users.hasOwnProperty(socket.handshake.username))
  {
    users[socket.handshake.username][socket.id] = currentUser;
  }
  else
  {
    users[socket.handshake.username] = {};
    users[socket.handshake.username][socket.id] = currentUser;
  }

  redis_pool.acquire(function(err, redisClient) {
      redisClient.hget(socket.handshake.username,"n",function (err, reply) { 
        redis_pool.release(redisClient);
        if (!reply) return ;
        console.info('notification:' + socket.handshake.username + ':' +reply.toString());
        if(parseInt(reply.toString())>0)
        {
           socket.emit("notification", {from_username:'',to_username:'',title:'you have '+reply.toString()+' notification',body:''});
        }

      });
      
  });

  socket.on('notification', function(data){
     console.info('- toUser '+ data.to_username +' message: '+ data.title +' at ' + new Date().toString() );
     if (!data.to_username || !data.title) return ;
     var to_username = data.to_username.toLowerCase();
     var tousers = users[to_username];
     for ( var socket_id in tousers)
     {
       var touser = tousers[socket_id];
       if (touser)
       {
           online.sockets[socket_id].emit("notification",
               {from_username:currentUser.username,to_username:to_username,title:data.title,body:data.body});
       }else
       {
         socket.emit("notification",
           {from_username:currentUser.username,to_username:currentUser.username,title:to_username+' not online!',body:''});
       }       
     }

  });
    
  socket.on('disconnect', function(){
     console.info('- User '+ socket.handshake.username +' disconnected ('+ socket.handshake.address.address +').'+' at ' + new Date().toString());
     delete users[socket.handshake.username][socket.id];
     if (Object.keys(users[socket.handshake.username]).length==0)
     {
       delete users[socket.handshake.username];
     }
     count--;
  });
});

var admin = io.of('/admin');
admin.on('connection', function (socket) {
  socket.on("search", function(data) {
      var user = users[data.username.toLowerCase()];
      if (user)
      {
        socket.emit("search", { username: data.username.toLowerCase(),userdata:user });
      }else{
        socket.emit("search", { username: undefined });
      }
  });

  socket.on("onlineuser", function() {
      socket.emit("onlineuser", { online_users: users });
  });
  
  setInterval(function() {
    socket.emit('count', {
                count: count,
                usercount:Object.keys(users).length
     });  
  },1000);

});
