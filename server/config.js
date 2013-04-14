var config = {};    
if(process.env.NODE_ENV)
{
  config.env = process.env.NODE_ENV;
}else
{
  config.env = 'development';
}

if(config.env=='development')
{
  config.redis = { hostname:'127.0.0.1',port:6379};  
}
if(config.env=='production')
{
  config.redis = { hostname:'127.0.0.1',port:6379};  
}

module.exports = config;
