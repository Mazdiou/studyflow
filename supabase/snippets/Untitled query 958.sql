update public.campaigns set is_current = false where is_current;

insert into public.campaigns (
  label, opens_on, deadline_non_dap, deadline_dap, deadline_pro,
  interviews_end_on, institutions_answer_deadline, final_choice_deadline,
  is_current
) values (
  '2027/2028', '2027-10-01', '2027-11-30', '2027-12-15', '2027-12-15',
  '2028-03-15', '2028-04-30', '2028-05-31', true
);