/* eslint-disable newline-per-chained-call */
import Joi from 'joi';

export default (req, res, next) => {

    return Joi
        .object(
            {
              name        : Joi.string().max(50),
              genres      : Joi.array().items(Joi.string()).min(1),
              originYear  : Joi.number().min(1500).max(new Date().getFullYear())
            }
        )
        .validate(req.body, err => {
            if (err)
                return res.api.send(err.details, res.api.codes.UNPROCESSABLE_ENTITY);

            return next();
        });
}
