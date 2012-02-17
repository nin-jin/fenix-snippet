"use strict"
Components.utils.import( 'resource://snippet/fenix/this.jsm' )

let $snippet= $()
let $fenix= $( '../fenix/' )

let core= new function( ){
    
    
    let allClients= $fenix.ProxyMap()
    
    this.addClient= function( client ){
        allClients.add( client )
        if( allClients.list.length > 1 ) return this
        
        this.autoRefresher().runAsync()
        return this
    }
    
    this.dropClient= function( client ){
        allClients.drop( client )
    }
    
    
    let weatherSource= $fenix.Uri.fromString( 'http://export.yandex.ru/weather/' )
    let refreshPeriod= 60 * 60 * 1000
    
    this.autoRefresher= $fenix.FiberThread( function( ){
        
        while( allClients.list.length ){
            
            let response= yield $fenix.Dom.fromResource( weatherSource )
            let temperature= response.select(' // temperature / text() ')
            let condition= response.select(' weather_type / text() ')
            
            allClients.map.weather= [ temperature, condition ].join( ', ' )
            yield $fenix.FiberSleep( refreshPeriod )
            
        }
        
    } )
    
    
    let weatherPage= $fenix.Uri.fromString( 'http://weather.ya.ru/' )
    
    this.openWeatherBy= function( client ){
        client.ownerDocument.defaultView.gBrowser.loadURI( weatherPage )
    }
    

}
