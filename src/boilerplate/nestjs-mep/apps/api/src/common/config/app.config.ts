import { registerAs } from '@nestjs/config';
import { NodeEnv } from '@prowerbdigital/common';
import Joi from 'joi';

export interface IAppConfig {
  nodeEnv: NodeEnv;
  port: number;
}

export const appSchema = {
  NODE_ENV: Joi.string().valid('dev', 'stag', 'prod').required(),
  PORT: Joi.number().default(8080),
};

export const getAppConfig = (): IAppConfig => ({
  nodeEnv: (process.env.NODE_ENV as NodeEnv) || NodeEnv.Dev,
  port: Number(process.env.PORT ?? 8080),
});

export const appConfiguration: (() => IAppConfig) & { KEY: string | symbol } = registerAs(
  'app',
  getAppConfig,
);
