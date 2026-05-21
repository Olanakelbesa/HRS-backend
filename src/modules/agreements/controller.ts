import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/request';
import * as agreementService from './service';

export const listOwnerAgreements = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const result = await agreementService.listOwnerAgreements(userId, req.query as any);
  return res.status(200).json({ message: 'Agreements retrieved', data: result });
};

export const listRenterAgreements = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const result = await agreementService.listRenterAgreements(userId, req.query as any);
  return res.status(200).json({ message: 'Agreements retrieved', data: result });
};

export const exportOwnerAgreements = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const csv = await agreementService.exportOwnerAgreements(userId, req.query);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=agreements-${Date.now()}.csv`);
  return res.status(200).send(csv);
};

export const getAgreementDetail = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = String(req.params.id);
  const agreement = await agreementService.getAgreementDetail(id, userId);
  return res.status(200).json({ message: 'Agreement retrieved', data: { agreement } });
};

export const createOwnerAgreement = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const agreement = await agreementService.createOwnerAgreement(userId, req.body);
  return res.status(201).json({ message: 'Agreement created', data: { agreement } });
};

export const updateDraftAgreement = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const id = String(req.params.id);
  const agreement = await agreementService.updateDraftAgreement(id, userId, req.body);
  return res.status(200).json({ message: 'Agreement updated', data: { agreement } });
};

export const sendAgreement = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const id = String(req.params.id);
  const agreement = await agreementService.sendAgreement(id, userId, req.body?.offerExpiresAt);
  return res.status(200).json({ message: 'Agreement sent', data: { agreement } });
};

export const cancelAgreement = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const id = String(req.params.id);
  const agreement = await agreementService.cancelAgreement(id, userId, req.body?.reason);
  return res.status(200).json({ message: 'Agreement cancelled', data: { agreement } });
};

export const acceptAgreement = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const id = String(req.params.id);
  const agreement = await agreementService.acceptAgreement(id, userId);
  return res.status(200).json({ message: 'Agreement accepted', data: { agreement } });
};

export const rejectAgreement = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const id = String(req.params.id);
  const agreement = await agreementService.rejectAgreement(id, userId, req.body?.reason);
  return res.status(200).json({ message: 'Agreement rejected', data: { agreement } });
};

export const initiateDeposit = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const id = String(req.params.id);
  const result = await agreementService.initiateDeposit(id, userId);
  return res.status(200).json({ message: 'Deposit checkout ready', data: result });
};

export const getDepositStatus = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const id = String(req.params.id);
  const result = await agreementService.getDepositStatus(id, userId);
  return res.status(200).json({ message: 'Deposit status retrieved', data: result });
};

export const listAgreementPayments = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const id = String(req.params.id);
  const payments = await agreementService.listAgreementPayments(id, userId);
  return res.status(200).json({ message: 'Payments retrieved', data: payments });
};

export const terminateAgreement = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId as string;
  const id = String(req.params.id);
  const agreement = await agreementService.terminateAgreement(id, userId, req.body?.reason);
  return res.status(200).json({ message: 'Agreement terminated', data: { agreement } });
};
