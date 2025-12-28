asssign centre iid > presiding > store centre iid on 
asssign centre iid > asspresiding > store centre iid-booth
asssign centre iid > poling > store centre iid-booth-person 
authentication.js ব্যবহার করব। 
------------ 
কেন্দ্রে prisiding, asspresiding এবং pooling অফিসার বল্টনের ক্ষেত্রে 

vote_centre টেবিল থেকে > 
    প্রত্যেক vote_centre_iid র জন একটি presiding_iid নিবে presiding_list টেবিল থেকে। 
        vote_centre Table এ "voter_both_total" যতটি আছে, ass_presiding_list টেবিল থেকে ততটি ass_presiding_iid নিবে। 
        প্রতিটি ass_presiding_iid এর জন্য দুইজন polling_iid নিবে। ["polling_list" টেবিল থেকে polling_iid]

যদি "disability" >yes থাকে তবে তাকে নিবে না। 
এটি হবে দায়িত্ব বল্টনের একটি এলগরিদম সফটওয়্যার। 

--------
জেনারেট বাটন থাকবে। তালিকার উপর থেকে নিচে সব এলোমেলো করে বসাবে। 
generate\1_generate.html এর মতো প্রতি ভোট সেন্টারের জন্য আলাদা আলাদা পাতা দেখাবে। 

ass_presiding_iid, এবং polling_iid এর "gender" থেকে সমান সংখ্যক Male, Female, Unknown (null) দিবে। 
অর্থাৎ মহিলার সংখ্যা ভাগ করে সমান হবে। 

আলাদা  একটি টেবিল SQL লিখে দাও, যেখানে জনারেট হয়ে সেভ করবে, যেন কোন ব্যক্তিকে কোথায় এসাইন করা হয়েছে সেটি থাকে। ("assign_code" আছে তিনটি টবিলেই presiding_list, ass_presiding_list এবং polling_list) 