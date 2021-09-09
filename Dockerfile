FROM public.ecr.aws/lambda/nodejs:14

RUN npm install chrome-aws-lambda@8.0.2 puppeteer-core@8.0.0
COPY index.js  ${LAMBDA_TASK_ROOT}

CMD [ "index.handler" ]