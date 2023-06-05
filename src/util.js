var path = require('path');
var Dir = require('./dir.js');
var fileReader = require('./fileReader.js');


var Util = function(root){
    if(root)
      this.root = root;
};
Util.prototype = {
  root: __dirname,
  path: {
    normalize: function(path) {
      if(path instanceof Dir || path instanceof Dir.File){
        path = path.path;
      }
      return path.split(/[\\\/]/).join('/');
    },
    resolve: async function( filePath, prevFile, dirs ){
      var data, file;
      if(prevFile && filePath[0] === '.'){
        file = prevFile.dir.clone().file(path.join(prevFile.subDir, filePath))
        try{
          data = await fileReader.read( file )
          return {file, data};
        }catch(e){ }
      }else{
        for( var i = 0, _i = dirs.length; i < _i; i++ ){
          try{
            file = dirs[i].file(filePath)
            data = await fileReader.read( file );
            //console.log('match', file.path)
            return {file, data};
          }catch( e ){ }
        }
      }

      return false;
    },
    getDisplayName: function( filePath ){
      console.log( filePath );
      if( filePath.indexOf( 'template/' ) === 0 )
        filePath = filePath.substr( 'template/'.length );
      return filePath;
    },
    getOsPath: function( filePath ){
      return filePath.split( path.posix.sep ).join( path.sep );
    }
  },
  deepAssign: function( a, b ){
    if( !b )
      return a;

    for( var key in b ){
      if( typeof b[ key ] === 'object' ){
        if( Array.isArray( b[ key ] ) ){
          if( Array.isArray( a[ key ] ) ){
            a[ key ] = a[ key ].concat( b[key] );
          }else{
            a[ key ] = b[ key ];
          }
        }else{
          if( a[ key ] === void 0 ){
            a[ key ] = b[ key ];
          }else{
            util.deepAssign( a[ key ], b[ key ] );
          }
        }
      }else{
        a[ key ] = b[ key ];
      }
    }
    return a;
  }
};

module.exports = Util;