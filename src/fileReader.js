const fs = require( 'fs' ),
  path = require('path'),
  Dir = require('./dir.js');
var watch = require('recursive-watch');
var watchWrap = function(dir, callback){

  return watch(dir, function(fileName) {
    if(fileName.indexOf('_tmp_')>-1 || fileName.indexOf('_old__')>-1)
      return;

    callback(fileName);
  });
}

const fileCache = {};
let root = module;
while(root.parent)
  root = root.parent;

const CACHE_ENABLED = !process.env.DISABLE_CACHE;
let rootPath = root.path;

const M = module.exports = {
  Dependency: function(file) {
    this.files = [];
    var filePath = file instanceof Dir.File ? file.path : file;
    if(filePath)
      this.files.push(filePath);
  },
  read: async function(file, encoding = 'utf-8') {
    var data;
    if(typeof file === 'object' && !(file instanceof Dir.File)){
      data = file.data;
      file = file.file;
    }
    //filePath = M.normalizePath(filePath);
    var filePath = file instanceof Dir.File ? file.path : file;

    if(CACHE_ENABLED) {
      if( filePath in fileCache )
        if( encoding in fileCache[ filePath ] )
          return false;

      if( fileCache[ filePath ] instanceof Promise )
        return fileCache[filePath].error ? false : fileCache[filePath].data;
    }
    if(file === null)
      debugger

    await new Promise(function(resolve, reject) {
      if(data){
        fileCache[filePath] = {error: false, data: data.toString(encoding), file: file}
        return resolve( data );
      }

      fs.stat(filePath, function(err, data) {

        if(err){
          fileCache[filePath] = {error: new Error(err.message)};
          return reject( fileCache[filePath].error );
        }
        M.watch(file);
        fs.readFile(filePath, function(err, data) {
          if(err){
            fileCache[filePath] = {error: new Error(err.message)};
            return reject( fileCache[filePath].error );
          }

          fileCache[filePath] = {error: false, data: data.toString(encoding), file: file}
          resolve(fileCache[filePath].data);
        });
      });

    });

    return fileCache[filePath].error ? false : fileCache[filePath].data;
  },
  normalizePath: function(thePath) {
    var parsed;
    if(thePath instanceof Dir.File){
      parsed = path.parse(path.join(thePath.dir.path));
    }else{
      parsed = path.parse(path.relative(rootPath, thePath))
    }

    return path.posix.join(parsed.dir.split(/[\\\/]/).join(path.posix.sep), parsed.base);
  },
  _watches: {},
  watch: function(file) {
    var dir = file.dir.path;
    //const parsed = path.parse(M.normalizePath(filePath));//,
      //tokens = parsed.dir.split(/[\\\/]/).filter(String);
    if(dir){
      if(!(dir in M._watches)){
        M._watches[dir] = watchWrap(dir, function(filename){
          M.clearFileCache(file, filename);
        });
      }
    }


  },
  _waitForCacheClear: {},
  _waitingForCacheClear: null,
  _clearFileCache: function() {
    M._waitingForCacheClear = null;

    for(var file in M._waitForCacheClear){
      if( file in fileUsageInDependencyCache ){
        var usedInCache = fileUsageInDependencyCache[file];
        for(var cacheString in usedInCache){
          cacheString.split('*').forEach((name)=>{
            M.fire('update', name);
            changeFns[name] && changeFns[name].forEach(f=>f(name, fileCache[name].file));
          });
          delete dependencyCache[cacheString];
        }
        delete fileUsageInDependencyCache[file];
      }
      delete fileCache[ file ];
    }
    M._waitForCacheClear = {};
  },
  clearFileCache: function(file, fileName) {
    //var file = M.normalizePath(fileName);

    M.fire('update', fileName);

    M._waitForCacheClear[fileName] = file;
    if(!M._waitingForCacheClear)
      M._waitingForCacheClear = setTimeout(M._clearFileCache, 100);
  }
}
var Observer = require('./Observer.js');
Object.assign(M, Observer.prototype);
Observer.call(M);


const dependencyCache = {},
  fileUsageInDependencyCache = {},
  changeFns = {};


M.Dependency.prototype = {
  read: async function(file, encoding = 'utf-8') {
    this.register(file);

    return await M.read(file, encoding);
  },
  register: function(file) {
    var filePath = file instanceof Dir.File ? file.path : file;
    this.files.push(filePath);
  },
  result: async function(fn, changeFn) {
    let filesToken = this.files.sort().join('*');
    if(filesToken in dependencyCache){
      const cached = dependencyCache[filesToken];
      if(cached instanceof Promise)
        return cached;
      if(cached.error)
        throw cached.error;

      return cached.result;
    }


    let result;
    try{
      result = await fn();
    }catch(e){
      dependencyCache[filesToken] = {error: new Error(e.message)};

      throw dependencyCache[filesToken].error;
    }finally{
      for( var i = 0, _i = this.files.length; i < _i; i++ ){
        var file = this.files[ i ];
        if(typeof file === 'object' && file.file instanceof Dir.File){
          file = file.file.path;
        }
        (fileUsageInDependencyCache[file] || (fileUsageInDependencyCache[file] = {}))[filesToken] = this;
        if(changeFn){
          if(!(file in changeFns)){
            changeFns[file] = [];
          }
          changeFns[file].push(changeFn);
        }

      }

    }
    dependencyCache[filesToken] = {error: false, result};
    return result;
  }
};