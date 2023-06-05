const BabelPluginExtractImportNames = require('./src/babel-import-extractor.js')

var cache = {};
var util = require('./src/util');
var bCore = require( "@babel/core" ),
  Util = require('util'),
  path = require('path'),
  JSON5 = require('json5'),
  fileReader = require('./src/fileReader.js'),
  dir = require('./src/dir.js'),
  fs = require('fs');

var useSourceMaps = process.env.ENV === 'DEVELOP';

var exports = module.exports = {};

var d = __dirname;

const ExpressAdapter = function(cfg, a, b, c){
    if(!(this instanceof ExpressAdapter)){
      return new ExpressAdapter(cfg);
    }

    Object.assign(this, cfg);

    if(!this.app)
      throw new Error('express app is not specified');

    var _self = this;
    this.util = new util();
    this.engine = function(fileName, options, callback){
      ExpressAdapter.prototype.engine.call(_self, fileName, options, callback, this);
    };
    this.app.engine('jsx', this.engine);
    this.app.set("view engine", 'jsx');
};
var cacheCode = {};
ExpressAdapter.prototype = {
  includeList: ['DOM.js', 'Observer.js', 'Store.js', 'Transform.js', 'Ajax.js'],
  prebuild: function(){
    if(this.buildedLib)
      return;
    var resolved = require.resolve('react-vanilla');
    var dirname = path.dirname(resolved);
    var listOfFiles =
      [
        path.join(__dirname, 'src', 'core', 'Path.js'),
        path.join(__dirname, 'src', 'core', 'Require.js')
      ].concat(
        this.includeList
          .map(function(filename){
            return path.join(dirname, filename)
          })
      );


    this.buildedLib = listOfFiles
      .map(function(filename){
        return fs.readFileSync(filename, 'utf-8');
      }).join('\n');

    this.app.get('/js/____lib.js', (req,res) => res.end(this.buildedLib));
  },
  build: async function({file, fileName, options, callback, view, dependency, rootDir, buildDependencies}){
    var _self = this;
    file = file || new dir.File(rootDir, view.name+view.ext);

    var code;

    var additional = options;






    code = await dependency.read( file );

    /*if(additional && additional.route && additional.route.cacheToken){
      dependency.register(typeof additional.route.cacheToken === 'function' ? additional.route.cacheToken(additional): additional.route.cacheToken)
    }*/
    if(additional && additional.onChange){
      var listenUpdate = function(fileName) {
        if(fileName === file.path){
          additional.onChange();
          additional.onChange.uns.forEach(fn => fn());
        }
      };
      (additional.onChange.uns || (additional.onChange.uns = [])).push(
        fileReader.on('update', listenUpdate)
      );
    }

    var configFile = file.clone(), configObject;
    configFile.ext = 'json5';
    if(additional && additional.route && additional.route.input){
      configObject = Object.assign({}, additional.route.input, {data: null, html: null});

    }else {
      try {
        configObject = JSON5.parse( await dependency.read( configFile ) )
      } catch( e ) { }
    }
    /*if( code in cacheCode ){
      return cacheCode[ code ];//.error, cacheCode[code].code)
    }*/
    var baseFile = file;

    const importExtractor = new BabelPluginExtractImportNames();

    var util = this.util;
    util.root = view.root;
    const sourceFileName = util.path.normalize(baseFile.subPath);
    const wrapInputPlugin = new JSXTemplateTuner(JSON.stringify( configObject || {} ), configObject && util.path.normalize(configFile.subPath));
    this.main = {};
    var out = {};

    var result = await dependency.result(async function(){
      return await new Promise( function( resolve, reject ){

        bCore.transform(
          code,
          {
            "plugins": [

              [ require( "@babel/plugin-transform-react-jsx" ), {
                "pragma": "D.h", // default pragma is React.createElement
                "pragmaFrag": "D.f", // default is React.Fragment
                "throwIfNamespace": false // defaults to true
              } ],
              //[simpleTransformToAMD]
              [ importExtractor.plugin ],
              [ wrapInputPlugin.plugin ],
              [ require( '@babel/plugin-transform-modules-amd' ) ]
            ],
            "generatorOpts": {
              "jsescOption": {
                "minimal": true
              }
            },
            sourceMaps: useSourceMaps,
            sourceFileName: sourceFileName,
            moduleId: sourceFileName
          }, async function( err, d, e ){
            if( err ){
              cacheCode[ code ] = { error: new Error( err.message ) };
              console.error(err);
              resolve( cacheCode[ code ] );
            }else{
              var imports = await Promise.all( importExtractor.state.map( async item => {


                var {file, data} = await util.path.resolve( item.from, baseFile, [rootDir] );
                var ext = item.from.split('.').pop();
                if(!file){
                  if(ext.length>5){
                    var {file, data} = await util.path.resolve( item.from+'.jsx', baseFile, [rootDir] );
                    if(file)
                      item.from+='.jsx';

                    if(!file){
                      var {file, data} = await util.path.resolve( item.from+'.js', baseFile, [rootDir] );
                      if(file)
                        item.from+='.js';
                    }
                  }
                }

                dependency.register( file );
                buildDependencies.push( file )
                return { base: baseFile, file: item.from, resolved: file, pos: item.fromLocation };
              } ) );
              var failed = imports.filter( a => !a.resolved );
              if( failed.length ){
                console.log(`ERROR: JSX '${baseFile.subPath}' Can not resolve: ${failed.map(f=>f.file).join(',')}`);
                return reject( failed )
              }
              cacheCode[ code ] = { error: false, data: d, file: baseFile };
              resolve( cacheCode[ code ] );
            }
          } );
      } );
    }, this.main.fileChanged);
    Object.assign(out, result);

    return result;
  },
  engine: async function(fileName, options, callback, view){
    this.prebuild();
    options = options || {};
    var dependency = new fileReader.Dependency();
    var htmlPath = options.html || this.html;

    var rootDir = new dir(view.root);
    var currentRoute = view.name+view.ext;
    var buildDependencies = [];

    var htmlTemplate = await dependency.read( new dir.File(rootDir, htmlPath) );

    var result = await this.build({fileName, options, callback, view, dependency, rootDir, htmlPath, buildDependencies});


    if(result.error) {

      callback(false,       `<html><head><Title>Error</Title>
      <script src="https://cdn.jsdelivr.net/npm/ansi_up@5.2.1/ansi_up.min.js"></script>
      </head>
      <body style="background: #030a21;color: #fff;"><script>
      document.body.innerHTML = '<pre>'+(new AnsiUp()).ansi_to_html((${JSON.stringify(result.error.message)}))+'</pre>';
      </script></body>
      </html>` );
    }else{

      if(result.data.depsResolved){

      }else{
        var depsCode = [];
        while(buildDependencies.length) {
          var nestedBuildDependencies = [];

          var code = await Promise.all( buildDependencies.map( async ( file ) => {
            return this.build( { file, options: {}, view, dependency, buildDependencies: nestedBuildDependencies } )
          } ) );

          code.forEach(module => depsCode.push(module.data.code));

          buildDependencies = nestedBuildDependencies;
        }
        var depsRand = Math.random().toString(36).substr(2);

        if(depsCode.length){
          this.app.get(`/js/${depsRand}.js`, (req,res) => res.end(depsCode.join('\n')));
        }
        result.data.depsData = {
          depsRand: depsCode.length ? depsRand : void 0
        }
        result.data.depsResolved = true;
      }

      delete options.html;
      dependency
      cache
      htmlTemplate = htmlTemplate.replace(/%CODE%/g, `<script>
${result.data.code}
  define('start', ['${currentRoute}'], function(main) {
    D.appendChild(document.body, main.default(
      new Store(${JSON.stringify(options)}).bindings()
    ))
  });
</script>` )
        .replace(/<\/head>/i, (a,b,c) => {
            return (`<script>window.env = window.env || {};</script>
<script src="/js/____lib.js"></script>
${result.data.depsData.depsRand?`<script src="/js/${result.data.depsData.depsRand}.js"></script>`:''}
</head>`);
        });
      callback(false, htmlTemplate)
    }

    return result;

  }
};


const template = require('@babel/template');
const {declare} = require('@babel/helper-plugin-utils');
const Path = require( "path" );
class JSXTemplateTuner {
  constructor(cfg, fileName) {
    this.plugin = declare(api => {
      return {
        visitor: {
          Program(path) {
            var functions = {};
            for( var i = 0, _i = path.node.body.length; i < _i; i++ ){
              var bodyElement = path.node.body[ i ];

              if( bodyElement.type === 'FunctionDeclaration' ){
                functions[ bodyElement.id.name ] = bodyElement
              }
            }
            var noExport = true;
            for( var i = 0, _i = path.node.body.length; i < _i; i++ ){
              var bodyElement = path.node.body[ i ];
              if(bodyElement.type === 'ExportDefaultDeclaration'){
                var declaration = bodyElement.declaration;
                var shouldExtend = false;

                if(declaration.type === 'Identifier'){
                  if(declaration.name in functions){
                    declaration = functions[ declaration.name ];
                  }
                }

                if(declaration.type === 'FunctionDeclaration'){
                  for( var j = 0, _j = declaration.params.length; j < _j; j++ ){
                    var param = declaration.params[ j ];
                    if(param.name === 'input'){
                      shouldExtend = true;
                      break;
                    }
                  }
                  if(shouldExtend){
                    noExport = false;
                    declaration.body.body.unshift(template.default.ast('input = inheritConfig( input );'));
                  }
                }else if(declaration.type === 'Identifier'){
                  noExport = false;
                  bodyElement.declaration = template.default.ast(`function Wrapper(input, children){return ${declaration.name}.call(this, inheritConfig( input ), children);}`);
                }
              }
            }

            if(noExport){
              var imports = [], other = [], scope = {anyJSX: false};
              for( var i = 0, _i = path.node.body.length; i < _i; i++ ){
                var bodyElement1 = path.node.body[ i ];
                if(bodyElement1.type === 'ImportDeclaration'){
                  imports.push(bodyElement1);
                }else{
                  other.push(bodyElement1);
                }
              }
              var wrapper = template.default.ast(`export default function Template(input, children){if(!(this instanceof Template))return new Template(input, children);input = inheritConfig( input ); this.dom = [];}`);
              for( var i = 0, _i = other.length; i < _i; i++ ){
                wrapper.declaration.body.body.push(pushJSXs(other[ i ], scope))
              }
              if(scope.anyJSX){
                wrapper.declaration.body.body.push(template.default.ast(`(this.dom.length < 2) && (this.dom = this.dom[0])`));
                path.node.body = imports.concat( wrapper );
              }
            }

            path.node.body.unshift(template.default.ast(`const __store = ${fileName?`window.__store['${fileName}'] = `:''}new Store(${cfg}), blockConfig = __store.bindings(), inheritConfig = new ConfigInheriter(blockConfig);`));
            fileName && path.node.body.unshift(template.default.ast(`(!window.__store) && (window.__store = {});`));
          }
        }
      }
    })
  }
}
var pushJSXs = function(node, scope) {
  if(node.type === 'ExpressionStatement'){
    if(node.expression.type === 'JSXElement' || node.expression.type === 'JSXFragment' || node.expression.type === 'JSXExpressionContainer'){
      scope.anyJSX = true;
      var pushAST = template.default.ast(`this.dom.push();`);
      pushAST.expression.arguments.push(node.expression);
      return pushAST;
    }
  }
  return node;
}


module.exports.ExpressAdapter = ExpressAdapter;