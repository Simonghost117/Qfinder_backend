// services/paginationService.js

export class PaginationService {
  static async paginate(model, {
    where = {},
    include = [],
    attributes = null,
    order = [['createdAt', 'DESC']],
    req,
    transformData = null
  }) {
    const { page, pageSize, offset } = req.pagination;
    
    const options = {
      where,
      include,
      attributes,
      order,
      limit: pageSize,
      offset,
      distinct: true // Importante cuando hay includes con joins
    };
    
    const { count, rows } = await model.findAndCountAll(options);
    
    const totalPages = Math.ceil(count / pageSize);
    const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl || req.originalUrl.split('?')[0]}`;
    
    // Transformar datos si se especifica una función
    const data = transformData ? await transformData(rows) : rows;
    
    return {
      data,
      meta: {
        pagination: {
          totalItems: count,
          itemCount: rows.length,
          itemsPerPage: pageSize,
          totalPages,
          currentPage: page
        },
        links: this._generateLinks(baseUrl, page, totalPages, pageSize, req.query)
      }
    };
  }
  
  static _generateLinks(baseUrl, currentPage, totalPages, pageSize, originalQuery) {
    const query = { ...originalQuery };
    delete query.page; // Eliminamos el page existente
    
    const queryString = Object.keys(query).length 
      ? `&${new URLSearchParams(query).toString()}`
      : '';
    
    return {
      first: `${baseUrl}?page=1&pageSize=${pageSize}${queryString}`,
      last: `${baseUrl}?page=${totalPages}&pageSize=${pageSize}${queryString}`,
      prev: currentPage > 1 
        ? `${baseUrl}?page=${currentPage - 1}&pageSize=${pageSize}${queryString}`
        : null,
      next: currentPage < totalPages 
        ? `${baseUrl}?page=${currentPage + 1}&pageSize=${pageSize}${queryString}`
        : null
    };
  }
}