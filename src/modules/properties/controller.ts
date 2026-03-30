import { Request, Response } from 'express';
import { propertyService } from "./service";
import { CreatePropertyInput } from "./schema";
import { GetPropertiesQueryInput } from "./schema";
import { UpdatePropertyInput } from "./schema";
import { UpdatePropertyStatusInput } from "./schema";



// export async function list(req: Request, res: Response) {
//   const page = Number(req.query.page) || 1;
//   const limit = Number(req.query.limit) || 20;
//   const result = await propertyService.listProperties({ page, limit });
//   return res.status(200).json({ status: 'success', data: result });
// }

// export async function getById(req: Request, res: Response) {
//   const property = await propertyService.getPropertyById(String(req.params.id));
//   return res.status(200).json({ status: 'success', data: { property } });
// }




/**
 * Create Property Controller
 * POST /api/properties
 */
export const createPropertyController = async (req: Request, res: Response) => {
  try {
    /**
     * IMPORTANT:
     * req.user must exist from your auth middleware
     * Example: req.user = { id: "..." }
     */
    const ownerId = (req as any).user?.id;

    if (!ownerId) {
      return res.status(401).json({
        message: "Unauthorized. Please login.",
      });
    }

    const body = req.body as CreatePropertyInput;

    const property = await propertyService.createProperty(ownerId, body);

    return res.status(201).json({
      message: "Property created successfully",
      data: property,
    });
  } catch (error: any) {
    console.error("Create property error:", error);

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};


/**
 * GET /api/properties
 */
export const getPropertiesController = async (req: Request, res: Response) => {
  try {
    const query = req.query as unknown as GetPropertiesQueryInput;

    const result = await propertyService.getProperties(query);

    return res.status(200).json({
      message: "Properties fetched successfully",
      data: result.properties,
      meta: result.meta,
    });
  } catch (error: any) {
    console.error("Get properties error:", error);

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};


export const getPropertyByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const propertyId = req.params.propertyId as string;


    const property = await propertyService.getPropertyById(propertyId);

    if (!property) {
      return res.status(404).json({
        message: "Property not found",
      });
    }

    return res.status(200).json({
      message: "Property fetched successfully",
      data: property,
    });
  } catch (error: any) {
    console.error("Get property by id error:", error);

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }

  
};




export const updatePropertyController = async (
  req: Request,
  res: Response
) => {
  try {
    const ownerId = (req as any).user?.id;

    if (!ownerId) {
      return res.status(401).json({
        message: "Unauthorized. Please login.",
      });
    }

    const propertyId = req.params.propertyId as string;
    const body = req.body as UpdatePropertyInput;

    const result = await propertyService.updateProperty(
      ownerId,
      propertyId,
      body
    );

    if (result === null) {
      return res.status(404).json({
        message: "Property not found",
      });
    }

    if (result === "UNAUTHORIZED") {
      return res.status(401).json({
        message: "Unauthorized. You are not the owner of this property.",
      });
    }

    return res.status(200).json({
      message: "Property updated successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Update property error:", error);

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};


export const deletePropertyController = async (
  req: Request,
  res: Response
) => {
  try {
    const ownerId = (req as any).user?.id;

    if (!ownerId) {
      return res.status(401).json({
        message: "Unauthorized. Please login.",
      });
    }

    const propertyId = req.params.propertyId as string;

    const result = await propertyService.softDeleteProperty(ownerId, propertyId);

    if (result === null) {
      return res.status(404).json({
        message: "Property not found",
      });
    }

    if (result === "UNAUTHORIZED") {
      return res.status(401).json({
        message: "Unauthorized. You are not the owner of this property.",
      });
    }

    return res.status(200).json({
      message: "Property soft deleted successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Delete property error:", error);

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};




export const getMyPropertiesController = async (
  req: Request,
  res: Response
) => {
  try {
    const ownerId = (req as any).user?.id;

    if (!ownerId) {
      return res.status(401).json({
        message: "Unauthorized. Please login.",
      });
    }

    const properties = await propertyService.getMyProperties(ownerId);

    return res.status(200).json({
      message: "Owner properties fetched successfully",
      data: properties,
    });
  } catch (error: any) {
    console.error("Get my properties error:", error);

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};




export const updatePropertyStatusController = async (
  req: Request,
  res: Response
) => {
  try {
    const ownerId = (req as any).user?.id;

    if (!ownerId) {
      return res.status(401).json({
        message: "Unauthorized. Please login.",
      });
    }

    const propertyId = req.params.propertyId as string;
    const { status } = req.body as UpdatePropertyStatusInput;

    const result = await propertyService.updatePropertyStatus(
      ownerId,
      propertyId,
      status
    );

    if (result === null) {
      return res.status(404).json({
        message: "Property not found",
      });
    }

    if (result === "UNAUTHORIZED") {
      return res.status(401).json({
        message: "Unauthorized. You are not the owner of this property.",
      });
    }

    return res.status(200).json({
      message: "Property status updated successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Update property status error:", error);

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
