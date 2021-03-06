console.error = function (err) {
    alert(JSON.stringify(err));
};

angular.module('bola', ['ionic', 'bolaControllers', 'bolaDirectives', 'pusher-angular'])

    .config(function ($stateProvider, $urlRouterProvider) {
        window.client = new Pusher('15e74208fb634414cc6d');

        $urlRouterProvider.otherwise('/');

        $stateProvider
            .state('events', {
                url: '/',
                templateUrl: 'templates/events.html'
            })
            .state('registration', {
                url: '/registration',
                controller: 'registrationCtrl',
                templateUrl: 'templates/registration.html'
            })
            .state('contacts', {
                url: '/contacts',
                templateUrl: 'templates/contacts.html'
            })
            .state('help', {
                url: '/help',
                templateUrl: 'templates/help.html'
            })
            .state('profile', {
                url: '/profile',
                templateUrl: 'templates/profile.html'
            })
            .state('contact_us', {
                url: '/contact_us',
                templateUrl: 'templates/contact_us.html'
            })
            .state('new_event', {
                url: '/new_event',
                templateUrl: 'templates/new_event.html'
            })
            .state('event', {
                url: '/event?eventId',
                controller: 'eventCtrl',
                reload: true,
                templateUrl: 'templates/event.html'
            });
    })

    .run(function ($rootScope, $ionicUser, $ionicPlatform, $state, $pusher) {
        $rootScope.user = $ionicUser.get();

        $ionicPlatform.ready(function () {
            var pusher = $pusher(window.client);
            $rootScope.channel = pusher.subscribe('messages');
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins.Keyboard)
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

            if (window.StatusBar)
                StatusBar.styleDefault();

        });

        // Listen to '$locationChangeSuccess', not '$stateChangeStart'
        $rootScope.$on('$locationChangeSuccess', function () {
            if (window.cordova && window.cordova.plugins.Keyboard)
                cordova.plugins.Keyboard.close();
            
            if (!$rootScope.user.name) {
                window.localStorage.clear();
                $state.go('registration');
            }
        });
    });