"use strict"
Components.utils.import( 'resource://fenix/this.jsm' )

let $weather= $()
let $fenix= $( '../fenix/' )

let Core= $fenix.Factory( new function( ){
    
    this.client= null
    
    this.temperature= ''
    this.image= ''
    this.condition= ''
    
    this.summary= ''
    this.tooltip= ''
    
    this.init= function( client ){
        this.client= client
        this.refreshClient()
        
        $weather.Core.all.add( this )
        if( $weather.Core.all.count() === 1 ) $weather.Updater().runAsync()
        
        return this
    }
    
    this.destroy= function( ){
        $weather.Core.all.drop( this )
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
    
} )

Core.all= $fenix.ProxyMap()
