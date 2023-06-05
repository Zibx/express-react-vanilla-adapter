var Observable = (function(){
    'use strict';
    var ArraySlice = [].slice;


    var Observable = function(){
        this._clearListeners();
    };
    Observable.prototype = {
        on: function( k, v ){
            ( this._listeners[ k ] || ( this._listeners[ k ] = [] ) ).push( v );
            var _self = this;
            return function ReleaseObservable(){
                _self.un( k, v );
            };
        },
        un: function( k, v ){
            var list = this._listeners[ k ];
            if( list ){
                var id = list.indexOf( v );
                if( id > -1 ){
                    list.splice( id, 1 );
                }
            }
        },
        fire: function( k ){
            var listeners = this._listeners[ k ],
              listener;
            if( listeners === void 0 )
                return;

            for( var i = 0, _i = listeners.length; i < _i; i++ ){
                listener = listeners[ i ];
                if( listener ){
                    listener.apply( this, ArraySlice.call( arguments, 1 ) );
                }
            }
        },
        once: function( k, v ){
            var _self = this,
              wrap = function(){
                  v.apply( this, arguments );
                  _self.un( k, wrap )
              };
            this.on( k, wrap );
        },
        _clearListeners: function(){
            this._listeners = {};
        }
    };
    return Observable;
})();

typeof module === 'object' && (module.exports = Observable);