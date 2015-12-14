// LDP operations
var Solid = Solid || {};
Solid.web = (function(window) {
    'use strict';

    // Init some defaults;
    var PROXY = "https://databox.me/proxy?uri={uri}";
    var TIMEOUT = 5000;

    $rdf.Fetcher.crossSiteProxyTemplate = PROXY;
    // common vocabs
    var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
    var RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
    var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
    var OWL = $rdf.Namespace("http://www.w3.org/2002/07/owl#");
    var PIM = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
    var UI = $rdf.Namespace("http://www.w3.org/ns/ui#");
    var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
    var LDP = $rdf.Namespace("http://www.w3.org/ns/ldp#");

    // return metadata for a given request
    var parseResponseMeta = function(resp) {
        var h = Solid.utils.parseLinkHeader(resp.getResponseHeader('Link'));
        var meta = {};
        meta.url = resp.getResponseHeader('Location');
        meta.acl = h['acl'];
        meta.meta = (h['meta'])?h['meta']:h['describedBy'];
        meta.user = (resp.getResponseHeader('User'))?resp.getResponseHeader('User'):'';
        meta.exists = false;
        meta.err = null;
        if (resp.status === 200) {
            meta.exists = true;
        } else if (resp.status >= 500) {
            meta.err = {
                status: 500,
                body: resp.responseText
            };
        }
        return meta;
    };

    // check if a resource exists and return useful Solid info (acl, meta, type, etc)
    // resolve(metaObj)
    var head = function(url) {
        var promise = new Promise(function(resolve) {
            var http = new XMLHttpRequest();
            http.open('HEAD', url);
            http.onreadystatechange = function() {
                if (this.readyState == this.DONE) {
                    resolve(parseResponseMeta(this));
                }
            };
            http.send();
        });

        return promise;
    };

    // fetch an RDF resource
    // resolve(graph) | reject(this)
    var get = function(url) {
        var promise = new Promise(function(resolve, reject) {
            var g = new $rdf.graph();
            var f = new $rdf.fetcher(g, TIMEOUT);

            var docURI = (url.indexOf('#') >= 0)?url.slice(0, url.indexOf('#')):url;
            f.nowOrWhenFetched(docURI,undefined,function(ok, body, xhr) {
                if (!ok) {
                    reject({ok: ok, status: xhr.status, body: body, xhr: xhr, g: g});
                } else {
                    resolve(g);
                }
            });
        });

        return promise;
    };

    // create new resource
    // resolve(metaObj) | reject
    var post = function(url, slug, data, isContainer) {
        var resType = (isContainer)?'http://www.w3.org/ns/ldp#BasicContainer':'http://www.w3.org/ns/ldp#Resource';
        var promise = new Promise(function(resolve, reject) {
            var http = new XMLHttpRequest();
            http.open('POST', url);
            http.setRequestHeader('Content-Type', 'text/turtle');
            http.setRequestHeader('Link', '<'+resType+'>; rel="type"');
            if (slug && slug.length > 0) {
                http.setRequestHeader('Slug', slug);
            }
            http.withCredentials = true;
            http.onreadystatechange = function() {
                if (this.readyState == this.DONE) {
                    if (this.status === 200 || this.status === 201) {
                        resolve(parseResponseMeta(this));
                    } else {
                        reject(this);
                    }
                }
            };
            if (data) {
                http.send(data);
            } else {
                http.send();
            }
        });

        return promise;
    };

    // update/create resource using HTTP PUT
    // resolve(metaObj) | reject
    var put = function(url, data) {
        var promise = new Promise(function(resolve, reject) {
            var http = new XMLHttpRequest();
            http.open('PUT', url);
            http.setRequestHeader('Content-Type', 'text/turtle');
            http.withCredentials = true;
            http.onreadystatechange = function() {
                if (this.readyState == this.DONE) {
                    if (this.status === 200 || this.status === 201) {
                        return resolve(parseResponseMeta(this));
                    } else {
                        reject(this);
                    }
                }
            };
            if (data) {
                http.send(data);
            } else {
                http.send();
            }
        });

        return promise;
    };

    // delete a resource
    // resolve(true) | reject
    var del = function(url) {
        var promise = new Promise(function(resolve, reject) {
            var http = new XMLHttpRequest();
            http.open('DELETE', url);
            http.withCredentials = true;
            http.onreadystatechange = function() {
                if (this.readyState == this.DONE) {
                    if (this.status === 200) {
                        return resolve(true);
                    } else {
                        reject(this);
                    }
                }
            };
            http.send();
        });

        return promise;
    }

    // return public methods
    return {
        head: head,
        get: get,
        post: post,
        put: put,
        del: del,
    };
}(this));
