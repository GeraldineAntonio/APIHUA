import { Request, Response } from 'express';
export declare class CapitulosController {
    getCapitulos(req: Request, res: Response): Promise<void>;
    getContenido(req: Request, res: Response): Promise<void>;
    clearCache(req: Request, res: Response): void;
    getHealth(req: Request, res: Response): Promise<void>;
}
export declare const capitulosController: CapitulosController;
