// It is mostly node.js posix path.

window.__Path = (function(){

  var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;

  var Path = {
    dirname: function( path ){
      var result = Path.posixSplitPath( path ),
        root = result[ 0 ],
        dir = result[ 1 ];

      if( !root && !dir ){
        // No dirname whatsoever
        return '.';
      }

      if( dir ){
        // It has a dirname, strip trailing slash
        dir = dir.substr( 0, dir.length - 1 );
      }

      return root + dir;
    },
    trim: function(result) {
      if( result[ 0 ] === '/' )
        return result.substr( 1 );
      return result;
    },
    resolve: function(){
      var resolvedPath = '',
        resolvedAbsolute = false;

      for( var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i-- ){
        var path = ( i >= 0 ) ? arguments[ i ] : '/';

        // Skip empty and invalid entries
        if( typeof path !== 'string' ){
          throw new TypeError( 'Arguments to path.resolve must be strings' );
        }else if( !path ){
          continue;
        }

        resolvedPath = path + '/' + resolvedPath;
        resolvedAbsolute = path[ 0 ] === '/';
      }

      // At this point the path should be resolved to a full absolute path, but
      // handle relative paths to be safe (might happen when process.cwd() fails)

      // Normalize the path
      resolvedPath = Path.normalizeArray( resolvedPath.split( '/' ),
        !resolvedAbsolute ).join( '/' );

      return Path.trim(( ( resolvedAbsolute ? '/' : '' ) + resolvedPath ) || '.');

    },
    normalizeArray: function( parts, allowAboveRoot ){
      var res = [];
      for( var i = 0; i < parts.length; i++ ){
        var p = parts[ i ];

        // ignore empty parts
        if( !p || p === '.' )
          continue;

        if( p === '..' ){
          if( res.length && res[ res.length - 1 ] !== '..' ){
            res.pop();
          }else if( allowAboveRoot ){
            res.push( '..' );
          }
        }else{
          res.push( p );
        }
      }

      return res;
    },
    join: function(){
      var path = '';
      for( var i = 0; i < arguments.length; i++ ){
        var segment = arguments[ i ];
        if( typeof segment !== 'string' ){
          throw new TypeError( 'Arguments to path.join must be strings' );
        }
        if( segment ){
          if( !path ){
            path += segment;
          }else{
            path += '/' + segment;
          }
        }
      }
      return Path.normalize( path );
    },
    basename: function( path, ext ){
      var f = Path.posixSplitPath( path )[ 2 ];
      // TODO: make this comparison case-insensitive on windows?
      if( ext && f.substr( -1 * ext.length ) === ext ){
        f = f.substr( 0, f.length - ext.length );
      }
      return f;
    },
    posixSplitPath: function( filename ){
      return splitPathRe.exec( filename ).slice( 1 );
    },
    normalize: function( path ){
      var isAbsolute = Path.isAbsolute( path ),
        trailingSlash = path && path[ path.length - 1 ] === '/';

      // Normalize the path
      path = Path.normalizeArray( path.split( '/' ), !isAbsolute ).join( '/' );

      if( !path && !isAbsolute ){
        path = '.';
      }
      if( path && trailingSlash ){
        path += '/';
      }

      return ( isAbsolute ? '/' : '' ) + path;
    },

// posix version
    isAbsolute: function( path ){
      return path.charAt( 0 ) === '/';
    }
  };
  return Path;
})();