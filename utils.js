import { ObjectId } from "mongodb";

export const asyncHandler = (fn) => (req, res, next) => fn(req, res, next).catch(next);

export const toObjectId = (id) => (ObjectId.isValid(id) ? new ObjectId(id) : null);
