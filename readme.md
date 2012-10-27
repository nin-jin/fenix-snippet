# fenix: делаем простейшую кнопку погоды!

На примере простого расширения для мозиллы демонстрируется мощь и простота использования феймворка "$fenix". Будет интересна как новичкам, так как без переусложнения описывает все шаги создания расширения, так и профессионалам, так как содержит много свежих идей. 

## О фреймворке.

Сам фреймворк (this.jsm) позволяет лишь легко и просто оперировать модулями, сводя инфраструктурный код к минимуму. Но к нему прилагается и базовая библиотека модулей, реализующая множество интересных концепций. Все модули грузятся лениво в момент обращения к ним, а фреймворк может подгружать не только предназначенные для него модули, но и многие другие (например, большинство из "resource://gre/modules/").

Основные принципы: ленивость, асинхронность, высокоуровневые абстракции, простота использования.

Проект пока ещё молодой и мало что умеет, но уже сейчас он берёт на себя большую часть необходимой рутины.

## Что будем делать.

Кнопка будет раз в час ходить на экспот яндекса за текущей погодой на улице и показывать её на тулбаре. При клике на кнопку будет открываться подробный прогноз на том же яндексе. Типичная такая кнопка-информер.
Важное замечание: в случае невозможности показать актуальную погоду (нет доступа к интернету, деление на ноль и тд) - нельзя дезинформировать пользователя. То есть любые исключительные ситуации должны быть адекватно обработаны.
Исходники готового расширения можно подсмотреть тут: https://github.com/nin-jin/fenix-snippet

## Базовый каркас.

Для начала нужно найти папку профиля, для этого вводим в адрессной строке "about:support" и жмём там кнопку "открыть папку профиля" и попадаем куда надо. Там будет папка extensions, в которой надо будет создать папку для нашего расширением. В качестве имени лучше использовать электронный адрес, например "snippet@example.org". Этот адрес является идентификатором расширения и должен быть указан также и в файле install.rdf, минималистичный пример которого можно найти [тут](https://github.com/nin-jin/fenix-snippet/blob/master/install.rdf). install.rdf кладётся внутрь только что созданной нами папки. 

[Подробнее о формате install.rdf](https://developer.mozilla.org/en/Install_Manifests)

Рядом также нужно положить файл "chrome.manifest" с примерно таким содержимым:

    resource snippet ./
    resource fenix ./fenix/
    overlay chrome://browser/content/browser.xul resource://snippet/snippet/Weather.xul

В первой строчке мы указываем, что все наши файлы будут доступны внутри браузера по ссылкам, начинающимся с "resource://snippet/". Вторая означает, что фреймворк fenix будет лежать в одноимённой папке. Ну а в третьей мы расширяем браузер нашим оверлеем, воспользовавшись такой ссылкой.

[Подробнее о формате chrome.manifest](https://developer.mozilla.org/en/Chrome_Registration)

[Подробнее об оверлеях](https://developer.mozilla.org/en/XUL_Overlays)

В расширениях для мозиллы как правило делают развесистую структуру директорий, но мы не будем париться и сделаем как проще. Помимо двух упомянутых выше файлов в папку с расширением нужно положить пакет с [фреймворком](https://github.com/nin-jin/fenix) и создать папку для нашего приложения (snippet). Расширение может состоять и более чем из одного приложения, при этом всё, что относится к одному приложению или библиотеке при такой структуре локализуется в одной папке, в отличие от традиционной структуры.

Первым делом создадим оверлей (snippet/Weather.xul), посредством которого добавим наш виджет в окно настроек тулбаров:

    ...
    <toolbarpalette id="BrowserToolbarPalette">
        <toolbaritem
            id="snippet-weather"
            style=" -moz-binding: url( 'resource://snippet/snippet/Weather.xbl#Weather' ) "
        />
    </toolbarpalette>
    ...

Заметьте, что тут добавляется лишь абстрактный пустой toolbaritem, который содержит ссылку на snippet/Weather.xbl в котором собственно и будет описан наш виджет, примерно следующим кодом:

    ...
    <content>
        <xul:toolbarbutton
            oncommand=" core.openWeather() "
            >
            <xul:image
                xbl:inherits=" src=image "
            />
            <xul:hbox
                xbl:inherits=" xbl:text=summary "
            />
        </xul:toolbarbutton>
    </content>
    ...

Тут мы говорим, что хотим видеть на тулбаре кнопку, изображение на этой кнопке будет браться из аттрибута image у toolbaritem, текст - из аттрибута summary, а при клике будет вызываться метод openWeather у toolbaritem.core.

[Подробнее о XUL](https://developer.mozilla.org/en/XUL_Reference): [toolbarbutton](https://developer.mozilla.org/en/XUL/toolbarbutton), [image](https://developer.mozilla.org/en/XUL/image), [hbox](https://developer.mozilla.org/en/XUL/hbox)

[Подробнее о XBL](https://developer.mozilla.org/en/XBL/XBL_1.0_Reference)

Файл с описанием кнопки служит лишь для отображения данных в xul и передачи событий в ядро, класс которого мы определим в файле snippet/Weather.jsm. Почему именно так? Да потому, что описывать интерфейс удобно в виде xml(xbl,xul,xhtml) + css, но для программирования всё ж javascript удобнее.

## Модуляризация

Основная функция фреймворка - обеспечение ленивой загрузки модулей. Каждый модуль (jsm-файл) исполняется ровно 1 раз, в практически абсолютно пустом контексте, наполняет его необходимыми полями и экспортирует некоторые из них. Типичный явскриптовый модуль выглядит так:

    // foo.jsm
    var EXPORTED_SYMBOLS= [ 'foo' ]
    
    function foo( ){  
        return 'bar'
    }
    
Чтобы воспользоваться функцией foo из этого модуля нужно сделать довольно много телодвижений:

    Components.utils.import( 'resource://absolute/path/to/foo.jsm' )
    var bar= foo()

[Подробнее о JSM](https://developer.mozilla.org/en/JavaScript_code_modules/Using)

Какие тут есть косяки:

 1. Не очевидно какие именно переменные будут импортированны. Поэтому правилом хорошего тона написания модуляей является экспорт ровно одной переменной - одноимённой модулю. Костыль, как импортировать не всё, а только то, что нужно, будет дальше по тексту.
 2. Для каждого импортируемого модуля нужно писать много кода. Components.utils обычно сокращают до переменной Cu, но это не сильно спасает положение. 
 3. Нужно знать абсолютный путь к модулю. Мало того, что это излишне длинно, так ещё и ухудшает "мобильность" кода. Однако с помощью неуклюжего костыля [XPCOMUtils.importRelative](https://developer.mozilla.org/en/JavaScript_code_modules/XPCOMUtils.jsm#importRelative%28%29) эта проблема решается.
 4. Сложности с ленивой загузкой. Если модуль нужно загружать не сразу при старте приложения, а по требованию, то приходится писать дополнительный код, для которого опять же есть костыль: [XPCOMUtils.defineLazyModuleGetter](https://developer.mozilla.org/en/JavaScript_code_modules/XPCOMUtils.jsm#defineLazyModuleGetter%28%29)

Все эти проблемы и призван решать фреймворк $fenix. И делает это довольно изящно. Первым делом нужно подключить сам фреймворк:

    Components.utils.import( 'resource://fenix/this.jsm' )
    
Либо так, если вы находитесь не в чистом глобальном контексте и не хотите его засорять:

    var $= Components.utils.import( 'resource://fenix/this.jsm', {} ).$

Первый вариант подключения мало того, что короче, так ещё и создаёт необходимую константу EXPORTED_SYMBOLS. Использовать его есть смысл только в тех модулях, которые будут подключаться, через фреймворк, а не напрямую через Cu.import и аналоги.

Так вот, $ - это функция, которая создаёт пакет модулей. Есть соглашение, что созданные с её помощью пакеты должны именоваться с символом $ вначале. Это не догма, но рекомендация, позволяющая повысить переносимость кода и как следствие упростить рефакторинг (везде, для доступа к одному и тому же модулю используется одна и та же последовательность символов начинающаяся с $). Давайте определим несколько пакетов для примера:

    var $weather= $() // пакет к которому принадлежит текущий файл
    var $fenix= $( '../fenix/' ) // пакет с фреймворком лежит рядом с текущим пакетом
    var $gre= $( 'resource://gre/modules/' ) // пакет с модулями поставляемыми с браузером ($.gre - предопределённый алиас)

А теперь воспользуемся некоторыми модулями из этих пакетов:

    var core= $weather.Core() // модуль Core.jsm
    $fenix.log( 'Hi! World' ) // модуль log.jsm
    var QueryInterface= $.gre.XPCOMUtils.generateQI( $.iface.nsIModule ) // модуль XPCOMUtils.jsm

Логика работы загрузчика проста: в момент обращения к модулю, если он ещё не загружен, происходит загрузка одноимённого файла (с расширением jsm разумеется) и возвращается одноимённый объект из глобального контекста загруженного модуля. Таким образом с программиста снимается ответственность за своевременную загрузку модулей и он может легко и с радостью плодить их столько, сколько необходимо.

## Бизнесс логика 

Итак, начнём с описания "ядра" нашей погодной кнопки. Суть его такова - для каждого вынесенного на тулбар виджета создаётся инстанс, неразрывно с связанного с ним, ядра. При удалении виджета - ядро уничтожается следом. Для связи виджета с ядром мы определим конструктор и деструктор виджета следующим образом:

    ...
    <field name="core" />
    <constructor> this.core= new this.$snippet.Weather( this ) </constructor>
    <destructor> this.core= this.core.destroy() </destructor>
    ...

Код довольно простой и в дополнительных объяснениях не нуждается. Разве что, стоит упомянуть о подключении пакетов к xbl:

    ...
    <field name="$"> Components.utils.import( 'resource://fenix/this.jsm', {} ).$ </field>
    <field name="$fenix"> this.$( '../fenix/' ) </field>
    <field name="$snippet"> this.$() </field>
    ...

Теперь определим у виджета набор свойств, вида:

    ...
    <property
        name="image"
        onset=" this.setAttribute( 'image', val ) "
    />
    ...
    
С помощью сеттера мы передаём значение в аттрибут, а оттуда оно уже с помощью магии xbl:inherits попадёт куда надо.

В результате, описание виджета у нас получилось таким: [View.xbl](https://github.com/nin-jin/fenix-snippet/blob/master/snippet/Weather.xbl)

Теперь приступим к реализации ядра. Начинаться оно будет с типовой шапки:

    "use strict"
    Components.utils.import( 'resource://fenix/this.jsm' )
    
    let $weather= $()
    let $fenix= $( '../fenix/' )
    
    ...

Ну а после неё - определение фабрики "ядер погодных виджетов":

    ...
    var Weather= $fenix.Factory( new function(){
        // определение полей
    })

$fenix.Factory - это фабрика фабрик :-) На основе переданного ей прототипа она создаёт функцию, которая клепает инстансы. Одновременно такая функция будет являться и классом, так что может может использована в проверках на instanceof:

    Weather( widget ) instanceof Weather // true
    ( new Weather( widget ) ) instanceof Weather // true

Использование ключевого слова new для инстанцирования не обязательно, но вполне допустимо. Если в прототипе указан метод init, то он будет вызван с теми же параметрами, что были переданы и фабрике.

Прежде чем продолжать давайте остановимся ненадолго на модуле $fenix.ProxyMap. Суть его заключается в том, чтобы хранить в себе список объектов и все обращения к себе проксировать к каждому из сохранённых в нём объектов. Понять суть его работы поможет следующий код:

    this.all= $fenix.ProxyMap() // Создаём прокси-маппер
    
    // добавляем объекты
    this.all.add( core1 ) 
    this.all.add( core2 )
    
    this.all.map.refreshClient() // у каждого объекта вызываем метод refreshClient
    this.all.map.image= 'data:,' // свойству image каждого объекта присваиваем значение
    this.all.map= { condition: 'облачно', temperature: -7 } // присваиваем сразу несколько свойств каждому объекту

    this.all.map.temperature // [ -7, -7 ]
    this.all.count() // 2
    this.all.list // [ core1, core2 ]
    
    this.all.drop( core2 ) // удаляем объект

Думаю уже понятно, что каждое ядро будет при создании регистрировать себя в реестре this.all, а при уничтожении - удалять. А сам реестр будет заниматься массовой рассылкой сообщений. Опишем всё это кодом:

    ...
    this.all= $fenix.ProxyMap()
    this.init= function( client ){
        this.client= client
        this.refreshClient()
        
        this.all.add( this )
        if( this.all.count() === 1 ) this.updater.runAsync()
        
        return this
    }
    ...
    
Тут мы сначала сохраняем виджет (заметьте, что при такой архитектуре клиентом может быть не только виджет но и любой специально подготовленный яваскрипт-объект), вызываем функцию обновления его данных, сохраняем ядро в реестре и самое интересное - запускаем асинхронную задачу обновления данных. Интересна она прежде всего тем, что реализована в виде всего 1 процедуры без каких либо колбэков, так характарных для асинхронного яваскрипт кода:

    ...
    this.updater= $fenix.FiberThread( function( ){
        
        while( this.all.count() ){
            try {
                // делаем запрос и обрабатываем данные
                var delay= 60 * 60 * 1000 // обновим через час
            } catch( exception ){
                // ненавязчиво информируем пользователя об ошибке
                var delay= 5 * 60 * 1000 // попробуем ещё раз через 5 минут
            }
            yield $fenix.FiberSleep( delay )
        }
        
    } ).apply( this )
    ...

То есть, this.updater - это волокно, привязанное к прототипу Weather, которое крутит бесконечный цикл по обновлению данных, пока есть активные виджеты. Если в процессе обновления возникают какие-либо ошибки - уменьшает время обновления до минимума.

[Подробнее о волокнах](http://nin-jin.github.com/article/article_fiber/article_fiber.xml)

На волокнах же основана и работа с вводом/выводом. В противовес стандартному низкоуровневому зоопарку nsIFile, nsIURI, nsIRequest, nsIStream, nsIChannel, nsITransport и множеству их потомков, библиотека $fenix использует единый интерфейс работы с удалёнными ресурсами:

 * exists - проверка существования ресурса
 * get - получение данных из ресурса в виде строки
 * put - запись данных в ресурс
 * sub - получения списка дочерних ресурсов
 * go - получение ссылки на ресурс по относительному пути
 * drop - удаление ресурса
 * и другие, в том числе специфичные для конкретных типов ресурсов

Каждый метод, который предполагает обращение к ресурсу, возвращает волокно, которое обеспечивает асинхронность запросов. Давайте, для примера, скачаем robots.txt с яндекса:

    var robotsText= yield $fenix.Uri.fromString( 'http://yandex.ru/robots.txt' ).get()

Но в случае с экспортом погоды нам возвращается XML, который нужно правильно распарсить с учётом ссылки, по по которой этот XML был скачен. Для этого есть модуль Dom и его метод fromResource, который принимает ссылку на ресурс, а возвращает волокно, которое возвратит не просто такст, а инстанс Dom с дом-деревом внутри:

    var weatherSource= $fenix.Uri.fromString( 'http://yandex.ru/robots.txt' )
    var weatherDom= yield $fenix.Dom.fromResource( weatherSource )
    this.image= $fenix.Uri.fromString( weatherDom.select(' / weather / image2 / text() ') )

В последней строчке мы воспользовались xpath запросом, чтобы выбрать нужные данные.

Теперь давайте совместим всё вместе и получим ядро кнопки погоды: [Weather.jsm](https://github.com/nin-jin/fenix-snippet/blob/master/snippet/Weather.jsm)