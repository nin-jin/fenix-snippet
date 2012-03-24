"use strict"
Components.utils.import( 'resource://fenix/this.jsm' )

let $snippet= $()
let $fenix= $( '../fenix/' )

let Weather= $fenix.Factory( new function( ){
    
    this.client= null
    
    this.temperature= ''
    this.image= ''
    this.condition= ''
    
    this.summary= ''
    this.tooltip= ''
    
    this.all= $fenix.ProxyMap()
    
    
    this.init= function( client ){
        this.client= client
        this.refreshClient()
        
        this.all.add( this )
        if( this.all.count() === 1 ) this.updater.runAsync()
        
        return this
    }
    
    this.destroy= function( ){
        this.all.drop( this )
    }
    
    
    this.refreshClient= function( ){
        this.client.temperature= this.temperature
        this.client.image= this.image
        this.client.condition= this.condition
        this.client.summary= this.summary
        this.client.tooltip= this.tooltip
    }
    
    this.openWeather= function( ){
        this.client.ownerDocument.defaultView.gBrowser.loadURI( 'http://weather.ya.ru/' )
    }
    
    
    var weatherSource= $fenix.Uri.fromString( 'http://export.yandex.ru/weather/' )
    
    this.updater= $fenix.FiberThread( function( ){
        while( this.all.count() ){
            
            try {
                
                var response= yield $fenix.Dom.fromResource( weatherSource )
                
                this.temperature= response.select(' / weather / temperature / text() ')
                this.condition= response.select(' / weather / weather_type / text() ')
                this.image= response.select(' / weather / image2 / text() ')
                this.summary= [ this.temperature, this.condition ].join( ', ' )
                this.tooltip= ''
                
                var delay= 60 * 60 * 1000
                
            } catch( exception ){
                
                $fenix.fail( exception )
                
                this.temperature= ''
                this.condition= ''
                this.image= 'data:,'
                this.summary= '>_<'
                this.tooltip= String( exception )
                
                var delay= 5 * 60 * 1000
                
            }
            
            this.all.map.refreshClient()
            
            yield $fenix.FiberSleep( delay )
            
        }
    } ).apply( this )
    

} )
