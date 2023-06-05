var path = require('path');

var File = function(dir, fileName) {
	this.dir = dir;

	//this.relative = fileName;
	var tokens = fileName.split(/[\\/]/);

	this.fileName = tokens.pop()
	this.subDir = path.join.apply(path, tokens);

};

File.prototype = {
	set ext(val){
		if(val.charAt(0) === '.'){
			val = val.substr( 1 );
		}
		this._ext = val;
	},
	get ext(){
		return this._ext;
	},
	set fileName(fileName){
		var fileToken = fileName.split('.');

    // TODO: check why it was this:
    // this.file = fileToken[0];
		// this.ext = fileToken.slice(1).join('.');
    if(fileToken.length>1) {
      this.ext = fileToken.pop();
      this.file = fileToken.join( '.' );
    }else{
      this.ext = '';
		  this.file = fileToken[0];
    }
		this._fileName = fileName;
	},
	get fileName(){
		return this._fileName;
	},
	set subDir(val){
		this._subDir = val;
	},
	get subDir(){
		return this._subDir;
	},
	clone: function() {
		return new File(this.dir, path.join(this.subDir, this.file+'.'+this.ext))
	},
	get path(){
		return path.join(this.dir.path, path.join(this.subDir, this.file+'.'+this.ext));
	},
	get subPath(){
		return path.join(this.subDir, this.file+'.'+this.ext);
	}
};

var Dir = function(base, dir) {
	this.base = base;
	this.dir = dir
	this.path = this.toString();
};
Dir.prototype = {
	constructor: Dir,
	toString: function() {
		return this.dir === void 0 ? this.base : path.join(this.base, this.dir);
	},
	file: function(fileName) {
		return new File(this, fileName);
	},
	clone: function() {
		return new Dir(this.base, this.dir);
	}
}
Dir.File = File;
module.exports = Dir;