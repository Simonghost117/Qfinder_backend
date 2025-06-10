// middlewares/pagination.js

export const paginationMiddleware = (defaultPageSize = 10, maxPageSize = 100) => {
  return (req, res, next) => {
    let page = Math.abs(parseInt(req.query.page)) || 1;
    let pageSize = Math.abs(parseInt(req.query.pageSize)) || defaultPageSize;
    
    // Validaciones
    page = page > 0 ? page : 1;
    pageSize = Math.min(pageSize, maxPageSize);
    
    req.pagination = {
      page,
      pageSize,
      offset: (page - 1) * pageSize
    };
    
    next();
  };
};