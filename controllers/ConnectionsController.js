var ConnectionsModel = require("../models/ConnectionsModel"),
    JSONLDView = require('../views/JSONLDView');

module.exports = function (request, response, next) {
  //1. Check whether this page is good: if it isn't, do a redirect
  //check if a datetime is set, otherwise, redirect towards the correct pageId of now
  if (!request.query.departureTime) {
    response.redirect(302, request.locals.config.baseUri + '/connections/?departureTime=' + encodeURIComponent(request.locals.page.getCorrectPageId(new Date)));
  } else if (request.locals.page.getCorrectPageId(decodeURIComponent(request.query.departureTime)) !== request.query.departureTime){
    response.redirect(302, request.locals.config.baseUri + '/connections/?departureTime=' + encodeURIComponent(request.locals.page.getCorrectPageId(request.query.departureTime)));
  } else {
    //2. If it is a good page, then we can start streaming out the response and a HTTP 200 OK should be returned.
    // → We will now have to create a model for the data we want to retrieve from the db
    var connections = new ConnectionsModel(request.db);
    var view = new JSONLDView({
      "@context" : {
        hydra: "http://www.w3.org/ns/hydra/core#",
        property: {
          "@id": "hydra:property",
          "@type": "@vocab"
        },
        required: "hydra:required",
        Collection: "hydra:Collection",
        member: {
          "@id": "hydra:member",
          "@type": "@id"
        },
        search: "hydra:search",
        PagedCollection: "hydra:PagedCollection",
        nextPage: {
          "@id": "hydra:next",
          "@type": "@id"
        },
        previousPage: {
          "@id": "hydra:previous",
          "@type": "@id"
        },
        TemplatedLink: "hydra:TemplatedLink",
        IriTemplate: "hydra:IriTemplate",
        template: "hydra:template",
        mapping: "hydra:mapping",
        IriTemplateMapping: "hydra:IriTemplateMapping",
        variable: "hydra:variable",
        lc: "http://semweb.mmlab.be/ns/linkedconnections#",
        gtfs: "http://vocab.gtfs.org/terms#",
        Connection: "http://semweb.mmlab.be/ns/linkedconnections#Connection",
        arrivalTime: "lc:arrivalTime",
        arrivalDelay: "lc:arrivalDelay",
        departureTime: "lc:departureTime",
        departureDelay: "lc:departureDelay",
        arrivalStop:{"@type":"@id","@id":"http://semweb.mmlab.be/ns/linkedconnections#arrivalStop"},
        departureStop:{"@type":"@id","@id":"http://semweb.mmlab.be/ns/linkedconnections#departureStop"},
        trip:{"@type":"@id","@id":"gtfs:trip"}
      },
      "@id" : request.locals.page.getCurrentPage(),
      "@type" : "PagedCollection",
      "nextPage" : request.locals.page.getNextPage(),
      "previousPage" : request.locals.page.getPreviousPage(),
      "search" : {
        "@type" : "IriTemplate",
        "template" : request.locals.config.baseUri + "/connections/{?departureTime}",
        "variableRepresentation" : "BasicRepresentation",
        "mapping" : {
          "@type" : "IriTemplateMapping",
          "variable" : "departureTime",
          "required" : true,
          "property" : "http://semweb.mmlab.be/ns/linkedconnections#departureTimeQuery"
        }
      }
    });
    
    //3. Stream output when the graph is being generated
    connections.getPage(request.locals.page, function (error, connectionsStream) {
      if (error) {
        next(error);
      } else {
        //Create output
        response.status(200);
        response.type("application/ld+json");
        connectionsStream
          .pipe(view)
          .pipe(response)
          .on('end', next);
      }
    });
  }
};
