function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });
        if (allowedRoles.includes(req.user.role)) return next();
        return res.status(403).json({ message: 'Forbidden: insufficient privileges' });
    };
}
export { requireRole };
