from tastypie.authorization import  Authorization
from tastypie.resources import ModelResource, ALL, ALL_WITH_RELATIONS
from tastypie import fields

from .models import Product, ProductVersion, ApiKey
from ..environments.api import EnvironmentResource
from ..mtapi import MTResource, MTAuthorization, MTApiKeyAuthentication

import logging
logger = logging.getLogger(__name__)

class ReportResultsAuthorization(Authorization):
    """Authorization that only allows users with execute privileges."""

    def is_authorized(self, request, object=None):
        if request.method == "GET":
            return True
        elif request.user.has_perm("execution.execute"):
            return True
        else:
            return False



class ProductVersionResource(MTResource):
    """
    Return a list of product versions.

    Filterable by version field.
    """
    product = fields.ToOneField("moztrap.model.core.api.ProductResource", "product")

    class Meta:
        queryset = ProductVersion.objects.all()
        list_allowed_methods = ["get", "post"]
        detail_allowed_methods = ["get", "put", "delete"]
        fields = ["id", "version", "codename", "product"]
        filtering = {
            "version": ALL,
            "product": ALL_WITH_RELATIONS,
            }
        authentication = MTApiKeyAuthentication()
        authorization = MTAuthorization()



class ProductResource(MTResource):
    """
    Return a list of products.

    Filterable by name field.
    """

    productversions = fields.ToManyField(
        ProductVersionResource,
        "versions",
        full=True,
        )

    class Meta:
        queryset = Product.objects.all()
        list_allowed_methods = ["get", "post"]
        detail_allowed_methods = ["get", "put", "delete"]
        fields = ["id", "name", "description"]
        filtering = {"name": ALL}
        authentication = MTApiKeyAuthentication()
        authorization = MTAuthorization()
        always_return_data = True


    @property
    def model(self):
        """Model class related to this resource."""
        return Product


    def obj_create(self, bundle, request=None, **kwargs):
        """Oversee the creation of product and its required productversion.
        Probably not strictly RESTful.
        """

        # pull the productversions off, they don't exist yet
        productversions = bundle.data.pop('productversions', [])
        bundle.data["productversions"] = []

        # create the product
        updated_bundle = super(ProductResource, self).obj_create(bundle=bundle, request=request, **kwargs)
        product = self.model.objects.get(name=bundle.data["name"])

        # create the productversions
        for pv in productversions:
            ProductVersion.objects.get_or_create(product=product, **pv)

        return updated_bundle

    def obj_update(self, bundle, request=None, **kwargs):
        """Oversee updating of product.
        If this were RESTful, it remove all existing versions and add the requested versions.
        But this isn't restful, it just adds the version if it doesn't exist already.
        """

        # pull the productversions off, you can't edit them from here
        productversions = bundle.data.pop("productversions")
        bundle.data["productversions"] = []

        updated_bundle =  super(ProductResource, self).obj_update(bundle=bundle, request=request, **kwargs)

        # create the productversions
        for pv in productversions:
            ProductVersion.objects.get_or_create(product=updated_bundle.obj, **pv)

        return updated_bundle



class ProductVersionEnvironmentsResource(ModelResource):
    """Return a list of productversions with full environment info."""

    environments = fields.ToManyField(
        EnvironmentResource,
        "environments",
        full=True,
        )

    class Meta:
        queryset = ProductVersion.objects.all()
        list_allowed_methods = ['get']
        fields = ["id", "version", "codename"]

