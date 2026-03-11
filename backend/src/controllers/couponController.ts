import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

// ─── ADMIN: Create Coupon ───────────────────────────────────────────────────
export const createCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, discountType, discountValue, expiryDate, maxUses } = req.body;

    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      res.status(400).json({ message: 'Coupon code already exists' });
      return;
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountType,
        discountValue,
        expiryDate: new Date(expiryDate),
        maxUses
      }
    });

    res.status(201).json({ message: 'Coupon created successfully', coupon });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Get Coupons ─────────────────────────────────────────────────────
export const getCoupons = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.status(200).json({ coupons });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Toggle Coupon Status ────────────────────────────────────────────
export const toggleCouponActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { active } = req.body;

    const coupon = await prisma.coupon.update({
      where: { id },
      data: { active }
    });

    res.status(200).json({ message: 'Coupon status updated', coupon });
  } catch (error) {
    next(error);
  }
};

// ─── PUBLIC: Validate Coupon ──────────────────────────────────────────────────
export const validateCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ message: 'Coupon code is required' });
      return;
    }

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon) {
      res.status(404).json({ message: 'Invalid coupon code' });
      return;
    }

    if (!coupon.active) {
      res.status(400).json({ message: 'This coupon is no longer active' });
      return;
    }

    if (new Date() > new Date(coupon.expiryDate)) {
      res.status(400).json({ message: 'This coupon has expired' });
      return;
    }

    if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) {
      res.status(400).json({ message: 'This coupon has reached its usage limit' });
      return;
    }

    res.status(200).json({ 
      valid: true, 
      discountType: coupon.discountType, 
      discountValue: coupon.discountValue 
    });
  } catch (error) {
    next(error);
  }
};
