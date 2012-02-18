"use strict"
Components.utils.import( 'resource://snippet/fenix/this.jsm' )

let $snippet= $()
let $fenix= $( '../fenix/' )

let core= new function( ){
    
    
    let allViews= $fenix.ProxyMap()
    
    this.addView= function( client ){
        allViews.add( client )
        if( allViews.list.length > 1 ) return this
        
        this.autoRefresher().runAsync()
        return this
    }
    
    this.dropView= function( client ){
        allViews.drop( client )
    }
    
    
    let weatherSource= $fenix.Uri.fromString( 'http://export.yandex.ru/weather/' )
    
    this.autoRefresher= $fenix.FiberThread( function( ){
        
        while( allViews.count() ){
            try {
                
                var response= yield $fenix.Dom.fromResource( weatherSource )
                var temperature= response.select(' // temperature / text() ')
                var condition= response.select(' // weather_type / text() ')
                allViews.map.weather= [ temperature, condition ].join( ', ' )
                yield $fenix.FiberSleep( 60 * 60 * 1000 )
                
            } catch( exception ){
                allViews.map.weather= '>__<'
                yield $fenix.FiberSleep( 5 * 60 * 1000 )
            }
        }
        
    } )
    
    
    let weatherPage= $fenix.Uri.fromString( 'http://weather.ya.ru/' )
    
    this.openWeatherBy= function( client ){
        client.ownerDocument.defaultView.gBrowser.loadURI( weatherPage )
    }
    

}
