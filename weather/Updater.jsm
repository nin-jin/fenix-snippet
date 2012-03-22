"use strict"
Components.utils.import( 'resource://fenix/this.jsm' )

var $weather= $()
var $fenix= $( '../fenix/' )

var weatherSource= $fenix.Uri.fromString( 'http://export.yandex.ru/weather/' )

var weather= $weather.Core.prototype

var Updater= $fenix.FiberThread( function( ){
    while( $weather.Core.all.count() ){
        
        try {
            
            var response= yield $fenix.Dom.fromResource( weatherSource )
            
            weather.temperature= response.select(' / weather / temperature / text() ')
            weather.condition= response.select(' / weather / weather_type / text() ')
            weather.image= response.select(' / weather / image2 / text() ')
            weather.summary= [ weather.temperature, weather.condition ].join( ', ' )
            weather.tooltip= ''
            
            $weather.Core.all.map.refreshClient()
            
            var delay= 60 * 60 * 1000
            
        } catch( exception ){
            
            $fenix.fail( exception )
            
            weather.temperature= ''
            weather.condition= ''
            weather.image= 'data:,'
            weather.summary= '>_<'
            weather.tooltip= String( exception )
            
            $weather.Core.all.map.refreshClient()
            
            var delay= 5 * 60 * 1000
            
        }
        
        yield $fenix.FiberSleep( delay )
        
    }
} )
