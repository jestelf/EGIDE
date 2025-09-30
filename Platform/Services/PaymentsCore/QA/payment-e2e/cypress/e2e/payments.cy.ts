describe('Payments happy path', () => {
  it('captures card payment and issues settlement', () => {
    cy.visit('/merchant/payments');
    cy.get('[data-test=checkout-form]').within(() => {
      cy.get('input[name=amount]').clear().type('42.50');
      cy.get('select[name=currency]').select('EUR');
      cy.get('button[type=submit]').click();
    });

    cy.contains('Authorization approved').should('be.visible');
    cy.contains('Capture scheduled').should('be.visible');
    cy.contains('Settlement date').should('contain', 'UTC');
  });
});
