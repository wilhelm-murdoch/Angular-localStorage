angular.module('localStorage', ['ngCookies']).factory('$store', ['$parse', '$cookieStore', '$window', '$log', function ($parse, $cookieStore, $window, $log) {
	/**
	 * Global Vars
	 */
	var storage = (typeof $window.localStorage === 'undefined') ? undefined : $window.localStorage;
	var supported = !(typeof storage === 'undefined' || typeof $window.JSON === 'undefined');

	var privateMethods = {
		/**
		 * Pass any type of a string from the localStorage to be parsed so it returns a usable version (like an Object)
		 * @param res - a string that will be parsed for type
		 * @returns {*} - whatever the real type of stored value was
		 */
		parseValue: function (res) {
			var val;
			try {
				val = $window.JSON.parse(res);
				if (typeof val === 'undefined') {
					val = res;
				}
				if (val === 'true') {
					val = true;
				}
				if (val === 'false') {
					val = false;
				}
				if ($window.parseFloat(val) === val && !angular.isObject(val)) {
					val = $window.parseFloat(val);
				}
			} catch (e) {
				val = res;
			}
			return val;
		}
	};

	var publicMethods = {
		/**
		 * Set - let's you set a new localStorage key pair set
		 * @param key - a string that will be used as the accessor for the pair
		 * @param value - the value of the localStorage item
		 * @param expires - the time, in seconds, that this key will expire
		 * @returns {*} - will return whatever it is you've stored in the local storage
		 */
		set: function (key, value, expires) {
			if (!supported) {
				try {
					$cookieStore.put(key, value);
					return value;
				} catch(e) {
					$log.log('Local Storage not supported, make sure you have angular-cookies enabled.');
				}
			}

			var saver = {
				v: value
			}

			if(expires) {
				saver['e'] = (expires * 1000) + (new Date().getTime());
			}

			saver = $window.JSON.stringify(saver);
			storage.setItem(key, saver);
			return privateMethods.parseValue(saver);
		},

		/**
		 * Get - let's you get the value of any pair you've stored. Will also determine if the value is meant to expire.
		 *       If so, it will remove the item from loccal storage and return null.
		 * @param key - the string that you set as accessor for the pair
		 * @returns {*} - Object,String,Float,Boolean,Null depending on what you stored
		 */
		get: function (key) {
			if (!supported) {
				try {
					return privateMethods.parseValue($.cookie(key));
				} catch (e) {
					return null;
				}
			}

			var item = storage.getItem(key);

			if(!item) {
				return null
			}

			try {
				var parsed = $window.JSON.parse(item);
			} catch (e) {
				return item;
			}

			if(parsed.e && (new Date().getTime()) > parsed.e) {
				publicMethods.remove(key);
				return null;
			}

			return privateMethods.parseValue(parsed.v);
		},

		/**
		 * Remove - let's you nuke a value from localStorage
		 * @param key - the accessor value
		 * @returns {boolean} - if everything went as planned
		 */
		remove: function (key) {
			if (!supported) {
				try {
					$cookieStore.remove(key);
					return true;
				} catch (e) {
					return false;
				}
			}
			storage.removeItem(key);
			return true;
		},

		/**
		 * Bind - let's you directly bind a localStorage value to a $scope variable
		 * @param $scope - the current scope you want the variable available in
		 * @param key - the name of the variable you are binding
		 * @param def - the default value (OPTIONAL)
		 * @param expires - the time, in seconds, that this key will expire
		 * @returns {*} - returns whatever the stored value is
		 */
		bind: function ($scope, key, def, expires) {
			// If no defined value for def we use empty string
			def = (angular.isUndefined(def)) ? '' : def;
			if (!publicMethods.get(key)) {
				publicMethods.set(key, def, expires);
			}
			$parse(key).assign($scope, publicMethods.get(key));
			$scope.$watch(key, function (val) {
				if (angular.isDefined(val)) {
					publicMethods.set(key, val, expires);
				}
			}, true);
			return publicMethods.get(key);
		},
		/**
		 * Unbind - let's you unbind a variable from localStorage while removing the value from both
		 * the localStorage and the local variable and sets it to null
		 * @param $scope - the scope the variable was initially set in
		 * @param key - the name of the variable you are unbinding
		 */
		unbind: function($scope,key) {
			$parse(key).assign($scope, null);
			$scope.$watch(key, function () { });
			publicMethods.remove(key);
		}
	};
	return publicMethods;
}]);
